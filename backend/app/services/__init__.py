"""Services Package"""
from app.services.auth_service import normalize_phone, generate_otp, verify_otp
from app.services.profile_service import (
    check_artisan_phone,
    get_profile_by_id_or_phone,
    upsert_artisan_profile,
    update_artisan_profile,
    update_bank_details,
    save_avatar_image,
    check_buyer_phone,
    get_buyer_profile_by_id_or_phone,
    upsert_buyer_profile,
)
from app.services.product_service import (
    create_product,
    get_products,
    get_product_by_id,
    update_product,
    delete_product,
)
from app.services.inquiry_service import (
    create_inquiry,
    get_inquiry_by_id,
    add_message_to_inquiry,
    reply_to_inquiry,
    list_inquiries,
)
from app.services.order_service import (
    create_order,
    get_order_by_id,
    list_orders,
)

__all__ = [
    "normalize_phone",
    "generate_otp",
    "verify_otp",
    "check_artisan_phone",
    "get_profile_by_id_or_phone",
    "upsert_artisan_profile",
    "update_artisan_profile",
    "update_bank_details",
    "save_avatar_image",
    "check_buyer_phone",
    "get_buyer_profile_by_id_or_phone",
    "upsert_buyer_profile",
    "create_product",
    "get_products",
    "get_product_by_id",
    "update_product",
    "delete_product",
    "create_inquiry",
    "get_inquiry_by_id",
    "add_message_to_inquiry",
    "reply_to_inquiry",
    "list_inquiries",
    "create_order",
    "get_order_by_id",
    "list_orders",
]
