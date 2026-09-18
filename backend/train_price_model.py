#!/usr/bin/env python3

"""
Advanced Price Suggestion Model
Flipkart 20K Dataset
Designed for NVIDIA CUDA / A100 GPU.

Input:
    flipkart_com-ecommerce_sample.csv

Output:
    price_model.pkl

Target:
    discounted_price

Features:
    - product_name
    - product_category_tree
    - description
    - product_specifications
    - brand
    - product_rating
    - overall_rating
    - retail_price

Important:
    discounted_price is NEVER used as an input feature.
"""

import os
import re
import sys
import json
import warnings
import joblib

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

warnings.filterwarnings("ignore")


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_STATE = 42

TEST_SIZE = 0.15

MAX_WORD_FEATURES = 12000
MAX_CHAR_FEATURES = 8000

OUTPUT_MODEL = "price_model.pkl"


# ============================================================
# PRICE CLEANING
# ============================================================

def clean_price(value):

    if pd.isna(value):
        return np.nan

    text = str(value)

    # Keep digits and decimal point
    text = re.sub(r"[^\d.]", "", text)

    if not text:
        return np.nan

    try:
        return float(text)
    except ValueError:
        return np.nan


# ============================================================
# RATING CLEANING
# ============================================================

def clean_rating(value):

    if pd.isna(value):
        return 0.0

    text = str(value).strip()

    if text in ["No rating available", "No rating", ""]:
        return 0.0

    match = re.search(r"\d+(?:\.\d+)?", text)

    if not match:
        return 0.0

    try:
        rating = float(match.group())

        if rating < 0:
            return 0.0

        if rating > 5:
            return 5.0

        return rating

    except ValueError:
        return 0.0


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(value):

    if pd.isna(value):
        return ""

    text = str(value)

    # Remove escaped characters / excessive whitespace
    text = text.replace("\\n", " ")
    text = text.replace("\\t", " ")

    text = re.sub(r"\s+", " ", text)

    return text.strip().lower()


# ============================================================
# CATEGORY NORMALIZATION
# ============================================================

def map_flipkart_category(category):

    if not isinstance(category, str):
        return "Handicraft"

    text = category.lower()

    if any(k in text for k in [
        "saree",
        "kurti",
        "fabric",
        "dupatta",
        "clothing",
        "textile",
        "handloom",
        "shawl"
    ]):
        return "Handloom Textile"

    if any(k in text for k in [
        "pottery",
        "clay",
        "ceramic",
        "vase",
        "diya",
        "bowl",
        "terracotta"
    ]):
        return "Pottery & Clay"

    if any(k in text for k in [
        "wood",
        "wooden",
        "carving",
        "sheesham",
        "teak",
        "furniture"
    ]):
        return "Woodwork"

    if any(k in text for k in [
        "brass",
        "copper",
        "bronze",
        "metal",
        "idol",
        "sculpture",
        "pooja"
    ]):
        return "Metalwork"

    if any(k in text for k in [
        "jewellery",
        "jewelry",
        "necklace",
        "bangle",
        "earring",
        "ring",
        "silver",
        "gold"
    ]):
        return "Jewelry"

    if any(k in text for k in [
        "toy",
        "plush",
        "embroidery",
        "cushion",
        "quilt",
        "blanket",
        "knitted"
    ]):
        return "Embroidery"

    if any(k in text for k in [
        "charger",
        "adapter",
        "cable",
        "laptop",
        "mouse",
        "electronics",
        "gadget",
        "headphone",
        "power bank"
    ]):
        return "Electronics"

    return "Handicraft"


# ============================================================
# LOAD DATASET
# ============================================================

def load_dataset(csv_path):

    print("=" * 70)
    print("📂 LOADING FLIPKART DATASET")
    print("=" * 70)

    print(f"Dataset: {csv_path}")

    df = pd.read_csv(csv_path)

    print(f"Original rows: {len(df):,}")
    print(f"Original columns: {len(df.columns)}")

    required_columns = [
        "product_name",
        "product_category_tree",
        "discounted_price",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            f"Missing required columns: {missing}"
        )

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    df["target_price"] = df["discounted_price"].apply(clean_price)

    if "retail_price" in df.columns:

        df["retail_price_clean"] = (
            df["retail_price"]
            .apply(clean_price)
        )

    else:

        df["retail_price_clean"] = 0.0

    # --------------------------------------------------------
    # TEXT
    # --------------------------------------------------------

    df["product_name_clean"] = (
        df["product_name"]
        .fillna("")
        .apply(clean_text)
    )

    if "description" in df.columns:

        df["description_clean"] = (
            df["description"]
            .fillna("")
            .apply(clean_text)
        )

    else:

        df["description_clean"] = ""

    if "product_specifications" in df.columns:

        df["specifications_clean"] = (
            df["product_specifications"]
            .fillna("")
            .apply(clean_text)
        )

    else:

        df["specifications_clean"] = ""

    # --------------------------------------------------------
    # BRAND
    # --------------------------------------------------------

    if "brand" in df.columns:

        df["brand_clean"] = (
            df["brand"]
            .fillna("unknown")
            .apply(clean_text)
        )

    else:

        df["brand_clean"] = "unknown"

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    df["craft_type"] = (
        df["product_category_tree"]
        .apply(map_flipkart_category)
    )

    # --------------------------------------------------------
    # RATINGS
    # --------------------------------------------------------

    if "product_rating" in df.columns:

        df["product_rating_clean"] = (
            df["product_rating"]
            .apply(clean_rating)
        )

    else:

        df["product_rating_clean"] = 0.0

    if "overall_rating" in df.columns:

        df["overall_rating_clean"] = (
            df["overall_rating"]
            .apply(clean_rating)
        )

    else:

        df["overall_rating_clean"] = 0.0

    # --------------------------------------------------------
    # COMBINED TEXT
    # --------------------------------------------------------

    df["combined_text"] = (
        df["product_name_clean"]
        + " "
        + df["product_name_clean"]
        + " "
        + df["description_clean"]
        + " "
        + df["specifications_clean"]
    )

    # --------------------------------------------------------
    # REMOVE BAD TARGETS
    # --------------------------------------------------------

    df = df[
        (df["target_price"] >= 100)
        &
        (df["target_price"] <= 80000)
        &
        (df["product_name_clean"].str.len() > 0)
    ].copy()

    # --------------------------------------------------------
    # REMOVE DUPLICATES
    # --------------------------------------------------------

    df = df.drop_duplicates(
        subset=[
            "product_name_clean",
            "craft_type",
            "target_price"
        ]
    )

    df = df.reset_index(drop=True)

    print(f"Clean rows: {len(df):,}")

    print("\n📊 CATEGORY DISTRIBUTION")
    print("-" * 50)

    print(
        df["craft_type"]
        .value_counts()
        .to_string()
    )

    print("\n💰 PRICE STATISTICS")
    print("-" * 50)

    print(
        df["target_price"]
        .describe()
        .to_string()
    )

    return df


# ============================================================
# CREATE FEATURES
# ============================================================

def create_features(df):

    feature_columns = [
        "combined_text",
        "craft_type",
        "brand_clean",
        "product_rating_clean",
        "overall_rating_clean",
        "retail_price_clean",
    ]

    X = df[feature_columns].copy()

    y = df["target_price"].values

    return X, y


# ============================================================
# BUILD MODEL
# ============================================================

def create_model():

    print("\n" + "=" * 70)
    print("🧠 BUILDING ADVANCED PRICE MODEL")
    print("=" * 70)

    # --------------------------------------------------------
    # WORD TF-IDF
    # --------------------------------------------------------

    word_vectorizer = TfidfVectorizer(
        max_features=MAX_WORD_FEATURES,
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.98,
        sublinear_tf=True,
        strip_accents="unicode",
        lowercase=True,
    )

    # --------------------------------------------------------
    # CHARACTER TF-IDF
    # --------------------------------------------------------

    char_vectorizer = TfidfVectorizer(
        analyzer="char",
        max_features=MAX_CHAR_FEATURES,
        ngram_range=(3, 5),
        min_df=2,
        sublinear_tf=True,
        lowercase=True,
    )

    # --------------------------------------------------------
    # CATEGORICAL
    # --------------------------------------------------------

    categorical_transformer = OneHotEncoder(
        handle_unknown="ignore"
    )

    # --------------------------------------------------------
    # PREPROCESSOR
    # --------------------------------------------------------

    preprocessor = ColumnTransformer(
        transformers=[

            (
                "word_text",
                word_vectorizer,
                "combined_text"
            ),

            (
                "char_text",
                char_vectorizer,
                "combined_text"
            ),

            (
                "category",
                categorical_transformer,
                ["craft_type", "brand_clean"]
            ),

            (
                "numeric",
                "passthrough",
                [
                    "product_rating_clean",
                    "overall_rating_clean",
                    "retail_price_clean",
                ]
            ),
        ],

        remainder="drop"
    )

    # --------------------------------------------------------
    # XGBOOST
    # --------------------------------------------------------

    try:

        import xgboost as xgb

    except ImportError:

        raise RuntimeError(
            "\nXGBoost is not installed.\n"
            "Install it using:\n"
            "python -m pip install --user xgboost"
        )

    print("⚡ XGBoost detected")
    print(f"XGBoost version: {xgb.__version__}")

    print("\n🚀 Configuring NVIDIA CUDA...")

    model = xgb.XGBRegressor(

        n_estimators=1200,

        learning_rate=0.035,

        max_depth=8,

        min_child_weight=3,

        subsample=0.85,

        colsample_bytree=0.85,

        reg_alpha=0.05,

        reg_lambda=1.5,

        objective="reg:squarederror",

        tree_method="hist",

        device="cuda",

        max_bin=256,

        random_state=RANDOM_STATE,

        n_jobs=8,

    )

    pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),

            (
                "regressor",
                model
            )
        ]
    )

    return pipeline


# ============================================================
# TRAINING
# ============================================================

def train_model(df):

    X, y = create_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    print("\n" + "=" * 70)
    print("📚 DATA SPLIT")
    print("=" * 70)

    print(f"Training samples: {len(X_train):,}")
    print(f"Testing samples : {len(X_test):,}")

    # --------------------------------------------------------
    # LOG TARGET
    # --------------------------------------------------------

    print("\n🔢 Using log1p(price) target transformation")

    y_train_log = np.log1p(y_train)

    model = create_model()

    print("\n" + "=" * 70)
    print("🔥 STARTING GPU TRAINING")
    print("=" * 70)

    model.fit(
        X_train,
        y_train_log
    )

    print("\n✅ Training completed")

    # --------------------------------------------------------
    # PREDICTION
    # --------------------------------------------------------

    predicted_log = model.predict(X_test)

    predictions = np.expm1(predicted_log)

    predictions = np.maximum(
        predictions,
        0
    )

    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    mape = np.mean(
        np.abs(
            (y_test - predictions)
            / np.maximum(y_test, 1)
        )
    ) * 100

    print("\n" + "=" * 70)
    print("📊 MODEL EVALUATION")
    print("=" * 70)

    print(
        f"R² Score              : {r2:.4f}"
    )

    print(
        f"R² Percentage         : {r2 * 100:.2f}%"
    )

    print(
        f"MAE                   : ₹{mae:,.2f}"
    )

    print(
        f"RMSE                  : ₹{rmse:,.2f}"
    )

    print(
        f"MAPE                  : {mape:.2f}%"
    )

    # --------------------------------------------------------
    # CONFORMAL-STYLE ERROR RANGE
    # --------------------------------------------------------

    absolute_errors = np.abs(
        y_test - predictions
    )

    error_90 = np.percentile(
        absolute_errors,
        90
    )

    print(
        f"\n90% empirical error range: ±₹{error_90:,.2f}"
    )

    # --------------------------------------------------------
    # SAMPLE PREDICTIONS
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("🔍 SAMPLE PRICE PREDICTIONS")
    print("=" * 70)

    sample_data = [
        (
            "Handmade Wooden Jewelry Box",
            "Woodwork",
            "Handmade",
            4.5,
            4.5,
            1000
        ),

        (
            "Pure Silk Handloom Saree",
            "Handloom Textile",
            "Handmade",
            4.5,
            4.5,
            2500
        ),

        (
            "Handmade Terracotta Water Pot",
            "Pottery & Clay",
            "Local Artisan",
            4.0,
            4.0,
            500
        ),

        (
            "Handcrafted Brass Pooja Diya",
            "Metalwork",
            "Handmade",
            4.5,
            4.5,
            600
        ),

        (
            "Handmade Embroidered Cushion",
            "Embroidery",
            "Artisan",
            4.0,
            4.0,
            700
        ),
    ]

    for (
        name,
        category,
        brand,
        rating,
        overall,
        retail
    ) in sample_data:

        sample = pd.DataFrame([
            {
                "combined_text":
                    (
                        name.lower()
                        + " "
                        + name.lower()
                    ),

                "craft_type":
                    category,

                "brand_clean":
                    brand.lower(),

                "product_rating_clean":
                    rating,

                "overall_rating_clean":
                    overall,

                "retail_price_clean":
                    retail,
            }
        ])

        prediction_log = model.predict(
            sample
        )[0]

        prediction = float(
            np.expm1(prediction_log)
        )

        prediction = max(
            prediction,
            100
        )

        suggested = int(
            round(prediction / 50) * 50
        )

        lower = max(
            100,
            int(
                round(
                    (prediction - error_90)
                    / 50
                ) * 50
            )
        )

        upper = int(
            round(
                (prediction + error_90)
                / 50
            ) * 50
        )

        print(
            f"\n{name}"
        )

        print(
            f"Category       : {category}"
        )

        print(
            f"Predicted price: ₹{suggested:,}"
        )

        print(
            f"Suggested range: ₹{lower:,} - ₹{upper:,}"
        )

    return model, error_90


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(
    model,
    error_90,
    output_path
):

    artifact = {

        "model": model,

        "error_90": float(
            error_90
        ),

        "version":
            "advanced_flipkart_price_v1",

        "target":
            "discounted_price",

        "features": [
            "product_name",
            "description",
            "product_specifications",
            "product_category_tree",
            "brand",
            "product_rating",
            "overall_rating",
            "retail_price",
        ],

        "notes":
            "Price model trained without discounted_price leakage."
    }

    joblib.dump(
        artifact,
        output_path
    )

    print("\n" + "=" * 70)
    print("💾 MODEL SAVED")
    print("=" * 70)

    print(
        os.path.abspath(output_path)
    )


# ============================================================
# MAIN
# ============================================================

def main():

    dataset_file = (
        sys.argv[1]
        if len(sys.argv) > 1
        else
        "/home/arnalds.24it/datasets/"
        "flipkart_com-ecommerce_sample.csv"
    )

    if not os.path.exists(dataset_file):

        print(
            f"\n❌ Dataset not found:\n{dataset_file}"
        )

        sys.exit(1)

    print("\n🚀 ADVANCED FLIPKART PRICE ESTIMATION")
    print("NVIDIA CUDA / A100 Training")
    print()

    df = load_dataset(
        dataset_file
    )

    model, error_90 = train_model(
        df
    )

    save_model(
        model,
        error_90,
        OUTPUT_MODEL
    )

    print("\n🎉 TRAINING PIPELINE FINISHED")


if __name__ == "__main__":

    main()