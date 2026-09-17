"""
Product Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.models.product import ProductCreateRequest, ProductUpdateRequest
from app.models import dump_model
from app.services.product_service import (
    create_product,
    get_products,
    get_product_by_id,
    update_product,
    delete_product,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.post("")
def create_product_endpoint(req: ProductCreateRequest):
    """Create a new product listing."""
    if not req.title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="title is required")

    try:
        product = create_product(dump_model(req))
        return {
            "success": True,
            "product_id": product.get("id"),
            "product": product
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )


@router.get("")
def list_products_endpoint(
    artisan_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
):
    """List products with pagination and filters."""
    products, total = get_products(
        artisan_id=artisan_id,
        status=status_filter,
        category=category,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "success": True,
        "products": products,
        "total": total
    }



@router.get("/{id}")
def get_single_product_endpoint(id: str):
    """Get single product details."""
    product = get_product_by_id(id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return {
        "success": True,
        "product": product
    }


@router.put("/{id}")
@router.patch("/{id}")
def update_product_endpoint(id: str, req: ProductUpdateRequest):
    """Update product details."""
    updated = update_product(id, dump_model(req, exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID '{id}' not found")
    return {
        "success": True,
        "product": updated
    }


@router.delete("/{id}")
def delete_product_endpoint(id: str):
    """Delete a product by ID."""
    deleted = delete_product(id)
    return {
        "success": True,
        "deleted": deleted,
        "id": id
    }
