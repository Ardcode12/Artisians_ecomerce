"""Models package"""
from app.models.profile import (
    ProfileUpsertRequest,
    ProfileUpdateRequest,
    BankUpdateRequest,
    AvatarUpdateRequest,
    BuyerProfileUpsertRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from app.models.product import ProductCreateRequest, ProductUpdateRequest
from app.models.inquiry import (
    InquiryCreateRequest,
    MessageCreateRequest,
    ReplyCreateRequest,
)
from app.models.order import OrderCreateRequest
from app.models.ai import (
    PriceSuggestRequest,
    DescriptionGenRequest,
    EnhanceImageBase64Request,
)


def dump_model(model, **kwargs):
    """Safely dump pydantic model for both v1 (.dict) and v2 (.model_dump)."""
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)

__all__ = [
    "ProfileUpsertRequest",
    "ProfileUpdateRequest",
    "BankUpdateRequest",
    "AvatarUpdateRequest",
    "BuyerProfileUpsertRequest",
    "SendOtpRequest",
    "VerifyOtpRequest",
    "ProductCreateRequest",
    "ProductUpdateRequest",
    "InquiryCreateRequest",
    "MessageCreateRequest",
    "ReplyCreateRequest",
    "OrderCreateRequest",
    "PriceSuggestRequest",
    "DescriptionGenRequest",
    "EnhanceImageBase64Request",
]
