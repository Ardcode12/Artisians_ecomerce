/**
 * ArtisanLink — Translations
 * Supported languages: English, Hindi, Tamil, Telugu, Bengali, Punjabi, Marathi
 */

export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'pa' | 'mr';

export interface TranslationKeys {
  // ── Welcome / Auth ────────────────────────────────────────────────
  welcome_login: string;
  welcome_signup: string;
  welcome_tagline: string;

  // Auth — Phone
  auth_phone_headline: string;
  auth_phone_subtext: string;
  auth_phone_placeholder: string;
  auth_phone_send_otp: string;
  auth_phone_sending: string;

  // Auth — OTP
  auth_otp_headline: string;
  auth_otp_subtext: string;
  auth_otp_verify: string;
  auth_otp_verifying: string;
  auth_otp_resend: string;

  // Auth — Details
  auth_details_headline: string;
  auth_details_subtext: string;
  auth_details_placeholder: string;
  auth_continue: string;

  // Auth — Craft
  auth_craft_headline: string;
  auth_craft_subtext: string;
  auth_craft_other_placeholder: string;

  // Auth — Language
  auth_lang_headline: string;
  auth_lang_subtext: string;

  // Auth — Scheme
  auth_scheme_headline: string;
  auth_scheme_subtext: string;
  auth_scheme_placeholder: string;
  auth_scheme_skip: string;

  // Auth — Success
  auth_success_headline: string;
  auth_success_subtext: string;
  auth_success_go: string;

  // ── Home / Dashboard ──────────────────────────────────────────────
  home_greeting: string;
  home_greeting_prompt: string;
  home_search_placeholder: string;
  home_my_listings: string;
  home_see_all: string;
  home_orders_inquiries: string;
  home_view_all: string;
  home_your_earnings: string;
  home_this_month: string;
  home_growth: string;
  home_view_details: string;

  // Stats strip
  stats_active_listings: string;
  stats_new_inquiries: string;
  stats_this_month: string;

  // Hero cards
  hero_add_product: string;
  hero_add_product_sub: string;
  hero_start: string;
  hero_earnings_sub: string;
  hero_view_details: string;

  // ── Listings ──────────────────────────────────────────────────────
  listings_title: string;
  listings_search_placeholder: string;
  listings_add_product: string;
  listings_empty_title: string;
  listings_empty_sub: string;
  listings_filter_all: string;
  listing_status_published: string;
  listing_status_draft: string;
  listing_status_sold: string;
  listing_status_inquiries: string;

  // ── Add Product ───────────────────────────────────────────────────
  add_product_title: string;
  add_product_step_photo: string;
  add_product_step_describe: string;
  add_product_step_price: string;
  add_product_step_publish: string;
  add_product_take_photo: string;
  add_product_upload: string;
  add_product_title_label: string;
  add_product_description_label: string;
  add_product_category_label: string;
  add_product_price_label: string;
  add_product_units_label: string;
  add_product_publish: string;
  add_product_publishing: string;
  add_product_next: string;

  // ── Profile ───────────────────────────────────────────────────────
  profile_title: string;
  profile_edit: string;
  profile_craft_story: string;
  profile_edit_story: string;
  profile_logout: string;
  profile_section_business: string;
  profile_section_app: string;
  profile_section_help: string;
  profile_shop_name: string;
  profile_scheme_id: string;
  profile_location: string;
  profile_bank_account: string;
  profile_language: string;
  profile_push_notifications: string;
  profile_biometric: string;
  profile_help_support: string;
  profile_terms: string;
  profile_privacy: string;
  profile_rate_app: string;
  profile_listings: string;
  profile_sales: string;
  profile_rating: string;
  profile_revenue: string;

  // ── Drawer ────────────────────────────────────────────────────────
  drawer_settings: string;
  drawer_help: string;
  drawer_logout: string;
  drawer_scheme_label: string;

  // ── Inquiries ─────────────────────────────────────────────────────
  inquiries_title: string;
  inquiries_empty: string;
  inquiries_reply: string;
  inquiries_accept: string;
  inquiries_decline: string;
  inquiries_new: string;
  inquiries_pending: string;
  inquiries_closed: string;

  // ── Earnings ──────────────────────────────────────────────────────
  earnings_title: string;
  earnings_total: string;
  earnings_this_week: string;
  earnings_this_month: string;
  earnings_withdraw: string;
  earnings_pending: string;

  // ── Cart ─────────────────────────────────────────────────────────
  cart_title: string;
  cart_empty: string;
  cart_checkout: string;
  cart_total: string;
  cart_remove: string;

  // ── Categories ────────────────────────────────────────────────────
  categories_title: string;

  // ── Product Details ───────────────────────────────────────────────
  product_add_to_cart: string;
  product_inquire: string;
  product_description: string;
  product_reviews: string;
  product_in_stock: string;
  product_sold_out: string;

  // ── Language picker ───────────────────────────────────────────────
  lang_picker_title: string;

  // ── Common ────────────────────────────────────────────────────────
  common_cancel: string;
  common_save: string;
  common_back: string;
  common_loading: string;
  common_error_retry: string;
  common_no_data: string;
  common_done: string;
}

type Translations = Record<LanguageCode, TranslationKeys>;

export const translations: Translations = {
  // ════════════════════════════════════════════════════════════════════
  en: {
    welcome_login: 'Login',
    welcome_signup: 'Sign Up',
    welcome_tagline: 'Craft to Market',

    auth_phone_headline: 'Enter your phone number',
    auth_phone_subtext: 'We\'ll send you a one-time code to verify',
    auth_phone_placeholder: 'Phone Number',
    auth_phone_send_otp: 'Send OTP',
    auth_phone_sending: 'Sending…',

    auth_otp_headline: 'Enter the OTP',
    auth_otp_subtext: 'Sent to your number',
    auth_otp_verify: 'Verify',
    auth_otp_verifying: 'Verifying…',
    auth_otp_resend: 'Resend OTP',

    auth_details_headline: 'Tell us about yourself',
    auth_details_subtext: 'Just your name to get started',
    auth_details_placeholder: 'Your Name',
    auth_continue: 'Continue',

    auth_craft_headline: 'What do you make?',
    auth_craft_subtext: 'Pick the one that fits best',
    auth_craft_other_placeholder: 'Describe your craft…',

    auth_lang_headline: 'Choose your language',
    auth_lang_subtext: 'You can change this anytime',

    auth_scheme_headline: 'Have a government scheme ID?',
    auth_scheme_subtext: 'This helps buyers see you\'re a verified artisan — optional',
    auth_scheme_placeholder: 'Scheme or Cluster ID',
    auth_scheme_skip: 'Skip for now',

    auth_success_headline: 'You\'re all set!',
    auth_success_subtext: 'Your artisan profile is ready.',
    auth_success_go: 'Go to Dashboard',

    home_greeting: 'Welcome,',
    home_greeting_prompt: 'Let\'s get your craft online today',
    home_search_placeholder: 'Search your products…',
    home_my_listings: 'My Listings',
    home_see_all: 'See All →',
    home_orders_inquiries: 'Orders & Inquiries',
    home_view_all: 'View All →',
    home_your_earnings: 'Your Earnings',
    home_this_month: 'this month',
    home_growth: '↑ 18% from last month',
    home_view_details: 'View Details →',

    stats_active_listings: 'Active Listings',
    stats_new_inquiries: 'New Inquiries',
    stats_this_month: 'This Month',

    hero_add_product: 'Add New Product',
    hero_add_product_sub: 'Take a photo, speak about it — we\'ll do the rest',
    hero_start: 'Start',
    hero_earnings_sub: 'Your earnings this month',
    hero_view_details: 'View Details',

    listings_title: 'My Listings',
    listings_search_placeholder: 'Search listings…',
    listings_add_product: 'Add Product',
    listings_empty_title: 'No listings found',
    listings_empty_sub: 'Try a different filter or search term',
    listings_filter_all: 'All',
    listing_status_published: 'Published',
    listing_status_draft: 'Draft',
    listing_status_sold: 'Sold',
    listing_status_inquiries: 'Inquiries',

    add_product_title: 'Add New Product',
    add_product_step_photo: 'Photo',
    add_product_step_describe: 'Describe',
    add_product_step_price: 'Price',
    add_product_step_publish: 'Publish',
    add_product_take_photo: 'Take a Photo',
    add_product_upload: 'Upload from Gallery',
    add_product_title_label: 'Product Title',
    add_product_description_label: 'Description',
    add_product_category_label: 'Category',
    add_product_price_label: 'Set Your Price',
    add_product_units_label: 'Units Available',
    add_product_publish: 'Publish Product',
    add_product_publishing: 'Publishing…',
    add_product_next: 'Next',

    profile_title: 'Profile',
    profile_edit: 'Edit',
    profile_craft_story: 'My Craft Story',
    profile_edit_story: 'Edit Story',
    profile_logout: 'Log Out',
    profile_section_business: 'Business',
    profile_section_app: 'App',
    profile_section_help: 'Help & Legal',
    profile_shop_name: 'Shop Name',
    profile_scheme_id: 'Scheme / Cluster ID',
    profile_location: 'Location',
    profile_bank_account: 'Bank Account',
    profile_language: 'Language',
    profile_push_notifications: 'Push Notifications',
    profile_biometric: 'Biometric Login',
    profile_help_support: 'Help & Support',
    profile_terms: 'Terms of Service',
    profile_privacy: 'Privacy Policy',
    profile_rate_app: 'Rate the App',
    profile_listings: 'Listings',
    profile_sales: 'Sales',
    profile_rating: 'Rating',
    profile_revenue: 'Revenue',

    drawer_settings: 'Settings',
    drawer_help: 'Help & Support',
    drawer_logout: 'Log Out',
    drawer_scheme_label: 'Scheme / Cluster ID',

    inquiries_title: 'Inquiries',
    inquiries_empty: 'No inquiries yet',
    inquiries_reply: 'Reply',
    inquiries_accept: 'Accept',
    inquiries_decline: 'Decline',
    inquiries_new: 'New',
    inquiries_pending: 'Pending',
    inquiries_closed: 'Closed',

    earnings_title: 'Earnings',
    earnings_total: 'Total Earned',
    earnings_this_week: 'This Week',
    earnings_this_month: 'This Month',
    earnings_withdraw: 'Withdraw',
    earnings_pending: 'Pending',

    cart_title: 'Cart',
    cart_empty: 'Your cart is empty',
    cart_checkout: 'Checkout',
    cart_total: 'Total',
    cart_remove: 'Remove',

    categories_title: 'Categories',

    product_add_to_cart: 'Add to Cart',
    product_inquire: 'Send Inquiry',
    product_description: 'Description',
    product_reviews: 'Reviews',
    product_in_stock: 'In Stock',
    product_sold_out: 'Sold Out',

    lang_picker_title: 'Select Your Language / भाषा चुनें',

    common_cancel: 'Cancel',
    common_save: 'Save',
    common_back: 'Back',
    common_loading: 'Loading…',
    common_error_retry: 'Something went wrong. Tap to retry.',
    common_no_data: 'Nothing here yet',
    common_done: 'Done',
  },

  // ════════════════════════════════════════════════════════════════════
  hi: {
    welcome_login: 'लॉगिन',
    welcome_signup: 'साइन अप',
    welcome_tagline: 'शिल्प से बाज़ार तक',

    auth_phone_headline: 'अपना फ़ोन नंबर दर्ज करें',
    auth_phone_subtext: 'हम आपको एक बार का कोड भेजेंगे',
    auth_phone_placeholder: 'फ़ोन नंबर',
    auth_phone_send_otp: 'OTP भेजें',
    auth_phone_sending: 'भेज रहे हैं…',

    auth_otp_headline: 'OTP दर्ज करें',
    auth_otp_subtext: 'आपके नंबर पर भेजा गया',
    auth_otp_verify: 'सत्यापित करें',
    auth_otp_verifying: 'जाँच हो रही है…',
    auth_otp_resend: 'OTP दोबारा भेजें',

    auth_details_headline: 'अपने बारे में बताएं',
    auth_details_subtext: 'शुरुआत के लिए बस अपना नाम',
    auth_details_placeholder: 'आपका नाम',
    auth_continue: 'जारी रखें',

    auth_craft_headline: 'आप क्या बनाते हैं?',
    auth_craft_subtext: 'जो सबसे उचित लगे चुनें',
    auth_craft_other_placeholder: 'अपना शिल्प बताएं…',

    auth_lang_headline: 'अपनी भाषा चुनें',
    auth_lang_subtext: 'आप इसे कभी भी बदल सकते हैं',

    auth_scheme_headline: 'क्या आपके पास सरकारी योजना ID है?',
    auth_scheme_subtext: 'यह खरीदारों को दिखाता है कि आप सत्यापित कारीगर हैं — वैकल्पिक',
    auth_scheme_placeholder: 'योजना या क्लस्टर ID',
    auth_scheme_skip: 'अभी छोड़ें',

    auth_success_headline: 'आप तैयार हैं!',
    auth_success_subtext: 'आपकी कारीगर प्रोफ़ाइल तैयार है।',
    auth_success_go: 'डैशबोर्ड पर जाएं',

    home_greeting: 'स्वागत है,',
    home_greeting_prompt: 'आज अपना शिल्प ऑनलाइन करें',
    home_search_placeholder: 'उत्पाद खोजें…',
    home_my_listings: 'मेरी सूचियाँ',
    home_see_all: 'सभी देखें →',
    home_orders_inquiries: 'ऑर्डर और पूछताछ',
    home_view_all: 'सभी देखें →',
    home_your_earnings: 'आपकी कमाई',
    home_this_month: 'इस महीने',
    home_growth: '↑ पिछले महीने से 18% अधिक',
    home_view_details: 'विवरण देखें →',

    stats_active_listings: 'सक्रिय सूचियाँ',
    stats_new_inquiries: 'नई पूछताछ',
    stats_this_month: 'इस महीने',

    hero_add_product: 'नया उत्पाद जोड़ें',
    hero_add_product_sub: 'फ़ोटो लें, बोलें — बाकी हम करेंगे',
    hero_start: 'शुरू करें',
    hero_earnings_sub: 'इस महीने की कमाई',
    hero_view_details: 'विवरण देखें',

    listings_title: 'मेरी सूचियाँ',
    listings_search_placeholder: 'सूचियाँ खोजें…',
    listings_add_product: 'उत्पाद जोड़ें',
    listings_empty_title: 'कोई सूची नहीं मिली',
    listings_empty_sub: 'कोई अन्य फ़िल्टर या खोज शब्द आज़माएं',
    listings_filter_all: 'सभी',
    listing_status_published: 'प्रकाशित',
    listing_status_draft: 'मसौदा',
    listing_status_sold: 'बिका हुआ',
    listing_status_inquiries: 'पूछताछ',

    add_product_title: 'नया उत्पाद जोड़ें',
    add_product_step_photo: 'फ़ोटो',
    add_product_step_describe: 'विवरण',
    add_product_step_price: 'मूल्य',
    add_product_step_publish: 'प्रकाशित',
    add_product_take_photo: 'फ़ोटो लें',
    add_product_upload: 'गैलरी से अपलोड करें',
    add_product_title_label: 'उत्पाद का नाम',
    add_product_description_label: 'विवरण',
    add_product_category_label: 'श्रेणी',
    add_product_price_label: 'मूल्य निर्धारित करें',
    add_product_units_label: 'उपलब्ध इकाइयाँ',
    add_product_publish: 'उत्पाद प्रकाशित करें',
    add_product_publishing: 'प्रकाशित हो रहा है…',
    add_product_next: 'आगे',

    profile_title: 'प्रोफ़ाइल',
    profile_edit: 'संपादित करें',
    profile_craft_story: 'मेरी शिल्प कहानी',
    profile_edit_story: 'कहानी संपादित करें',
    profile_logout: 'लॉग आउट',
    profile_section_business: 'व्यवसाय',
    profile_section_app: 'ऐप',
    profile_section_help: 'सहायता और कानूनी',
    profile_shop_name: 'दुकान का नाम',
    profile_scheme_id: 'योजना / क्लस्टर ID',
    profile_location: 'स्थान',
    profile_bank_account: 'बैंक खाता',
    profile_language: 'भाषा',
    profile_push_notifications: 'पुश सूचनाएं',
    profile_biometric: 'बायोमेट्रिक लॉगिन',
    profile_help_support: 'सहायता और समर्थन',
    profile_terms: 'सेवा की शर्तें',
    profile_privacy: 'गोपनीयता नीति',
    profile_rate_app: 'ऐप को रेट करें',
    profile_listings: 'सूचियाँ',
    profile_sales: 'बिक्री',
    profile_rating: 'रेटिंग',
    profile_revenue: 'राजस्व',

    drawer_settings: 'सेटिंग्स',
    drawer_help: 'सहायता और समर्थन',
    drawer_logout: 'लॉग आउट',
    drawer_scheme_label: 'योजना / क्लस्टर ID',

    inquiries_title: 'पूछताछ',
    inquiries_empty: 'अभी तक कोई पूछताछ नहीं',
    inquiries_reply: 'जवाब दें',
    inquiries_accept: 'स्वीकार करें',
    inquiries_decline: 'अस्वीकार करें',
    inquiries_new: 'नया',
    inquiries_pending: 'लंबित',
    inquiries_closed: 'बंद',

    earnings_title: 'कमाई',
    earnings_total: 'कुल कमाई',
    earnings_this_week: 'इस सप्ताह',
    earnings_this_month: 'इस महीने',
    earnings_withdraw: 'निकासी',
    earnings_pending: 'लंबित',

    cart_title: 'कार्ट',
    cart_empty: 'आपका कार्ट खाली है',
    cart_checkout: 'चेकआउट',
    cart_total: 'कुल',
    cart_remove: 'हटाएं',

    categories_title: 'श्रेणियाँ',

    product_add_to_cart: 'कार्ट में जोड़ें',
    product_inquire: 'पूछताछ करें',
    product_description: 'विवरण',
    product_reviews: 'समीक्षाएं',
    product_in_stock: 'स्टॉक में है',
    product_sold_out: 'बिक गया',

    lang_picker_title: 'अपनी भाषा चुनें',

    common_cancel: 'रद्द करें',
    common_save: 'सहेजें',
    common_back: 'वापस',
    common_loading: 'लोड हो रहा है…',
    common_error_retry: 'कुछ गलत हुआ। दोबारा करें।',
    common_no_data: 'अभी यहाँ कुछ नहीं है',
    common_done: 'हो गया',
  },

  // ════════════════════════════════════════════════════════════════════
  ta: {
    welcome_login: 'உள்நுழை',
    welcome_signup: 'பதிவு செய்',
    welcome_tagline: 'கைவினை முதல் சந்தை வரை',

    auth_phone_headline: 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்',
    auth_phone_subtext: 'உங்களுக்கு ஒரு OTP அனுப்புவோம்',
    auth_phone_placeholder: 'தொலைபேசி எண்',
    auth_phone_send_otp: 'OTP அனுப்பு',
    auth_phone_sending: 'அனுப்புகிறோம்…',

    auth_otp_headline: 'OTP உள்ளிடவும்',
    auth_otp_subtext: 'உங்கள் எண்ணுக்கு அனுப்பப்பட்டது',
    auth_otp_verify: 'சரிபார்',
    auth_otp_verifying: 'சரிபார்க்கிறோம்…',
    auth_otp_resend: 'OTP மீண்டும் அனுப்பு',

    auth_details_headline: 'உங்களைப் பற்றி சொல்லுங்கள்',
    auth_details_subtext: 'தொடங்க உங்கள் பெயர் மட்டும் போதும்',
    auth_details_placeholder: 'உங்கள் பெயர்',
    auth_continue: 'தொடர்',

    auth_craft_headline: 'நீங்கள் என்ன செய்கிறீர்கள்?',
    auth_craft_subtext: 'பொருத்தமானதை தேர்வு செய்யவும்',
    auth_craft_other_placeholder: 'உங்கள் கைவினையை விவரிக்கவும்…',

    auth_lang_headline: 'உங்கள் மொழியைத் தேர்வு செய்யவும்',
    auth_lang_subtext: 'நீங்கள் எப்போதும் மாற்றலாம்',

    auth_scheme_headline: 'அரசு திட்ட ID உள்ளதா?',
    auth_scheme_subtext: 'நீங்கள் சரிபார்க்கப்பட்ட கலைஞர் என காட்டும் — விருப்பமானது',
    auth_scheme_placeholder: 'திட்டம் அல்லது கிளஸ்டர் ID',
    auth_scheme_skip: 'இப்போது தவிர்',

    auth_success_headline: 'அனைத்தும் தயார்!',
    auth_success_subtext: 'உங்கள் கலைஞர் சுயவிவரம் தயார்.',
    auth_success_go: 'டாஷ்போர்டுக்கு செல்',

    home_greeting: 'வணக்கம்,',
    home_greeting_prompt: 'இன்று உங்கள் கைவினையை ஆன்லைனில் வையுங்கள்',
    home_search_placeholder: 'தயாரிப்புகளைத் தேடுங்கள்…',
    home_my_listings: 'என் பட்டியல்கள்',
    home_see_all: 'அனைத்தையும் பார் →',
    home_orders_inquiries: 'ஆர்டர்கள் & விசாரணைகள்',
    home_view_all: 'அனைத்தையும் பார் →',
    home_your_earnings: 'உங்கள் வருமானம்',
    home_this_month: 'இந்த மாதம்',
    home_growth: '↑ கடந்த மாதத்தை விட 18% அதிகம்',
    home_view_details: 'விவரங்கள் பார் →',

    stats_active_listings: 'செயலில் உள்ள பட்டியல்கள்',
    stats_new_inquiries: 'புதிய விசாரணைகள்',
    stats_this_month: 'இந்த மாதம்',

    hero_add_product: 'புதிய தயாரிப்பு சேர்',
    hero_add_product_sub: 'படம் எடு, பேசு — மீதாம் நாங்கள் செய்வோம்',
    hero_start: 'தொடங்கு',
    hero_earnings_sub: 'இந்த மாத வருமானம்',
    hero_view_details: 'விவரங்கள் பார்',

    listings_title: 'என் பட்டியல்கள்',
    listings_search_placeholder: 'பட்டியல்களைத் தேடுங்கள்…',
    listings_add_product: 'தயாரிப்பு சேர்',
    listings_empty_title: 'பட்டியல்கள் இல்லை',
    listings_empty_sub: 'வேறு வடிகட்டி அல்லது தேடல் சொல்ல முயற்சிக்கவும்',
    listings_filter_all: 'அனைத்தும்',
    listing_status_published: 'வெளியிடப்பட்டது',
    listing_status_draft: 'வரைவு',
    listing_status_sold: 'விற்பனையானது',
    listing_status_inquiries: 'விசாரணைகள்',

    add_product_title: 'புதிய தயாரிப்பு சேர்',
    add_product_step_photo: 'புகைப்படம்',
    add_product_step_describe: 'விவரிக்க',
    add_product_step_price: 'விலை',
    add_product_step_publish: 'வெளியிடு',
    add_product_take_photo: 'புகைப்படம் எடு',
    add_product_upload: 'கேலரியில் இருந்து பதிவேற்று',
    add_product_title_label: 'தயாரிப்பு பெயர்',
    add_product_description_label: 'விவரம்',
    add_product_category_label: 'வகை',
    add_product_price_label: 'விலை நிர்ணயி',
    add_product_units_label: 'கிடைக்கும் அலகுகள்',
    add_product_publish: 'தயாரிப்பை வெளியிடு',
    add_product_publishing: 'வெளியிடுகிறோம்…',
    add_product_next: 'அடுத்து',

    profile_title: 'சுயவிவரம்',
    profile_edit: 'திருத்து',
    profile_craft_story: 'என் கைவினை கதை',
    profile_edit_story: 'கதையைத் திருத்து',
    profile_logout: 'வெளியேறு',
    profile_section_business: 'வணிகம்',
    profile_section_app: 'ஆப்',
    profile_section_help: 'உதவி & சட்டம்',
    profile_shop_name: 'கடை பெயர்',
    profile_scheme_id: 'திட்டம் / கிளஸ்டர் ID',
    profile_location: 'இடம்',
    profile_bank_account: 'வங்கி கணக்கு',
    profile_language: 'மொழி',
    profile_push_notifications: 'புஷ் அறிவிப்புகள்',
    profile_biometric: 'உயிரியல் உள்நுழைவு',
    profile_help_support: 'உதவி & ஆதரவு',
    profile_terms: 'சேவை விதிமுறைகள்',
    profile_privacy: 'தனியுரிமை கொள்கை',
    profile_rate_app: 'ஆப்பை மதிப்பிடு',
    profile_listings: 'பட்டியல்கள்',
    profile_sales: 'விற்பனை',
    profile_rating: 'மதிப்பீடு',
    profile_revenue: 'வருவாய்',

    drawer_settings: 'அமைப்புகள்',
    drawer_help: 'உதவி & ஆதரவு',
    drawer_logout: 'வெளியேறு',
    drawer_scheme_label: 'திட்டம் / கிளஸ்டர் ID',

    inquiries_title: 'விசாரணைகள்',
    inquiries_empty: 'இன்னும் விசாரணைகள் இல்லை',
    inquiries_reply: 'பதில்',
    inquiries_accept: 'ஏற்கவும்',
    inquiries_decline: 'மறுக்கவும்',
    inquiries_new: 'புதியது',
    inquiries_pending: 'நிலுவையில்',
    inquiries_closed: 'மூடப்பட்டது',

    earnings_title: 'வருமானம்',
    earnings_total: 'மொத்த வருவாய்',
    earnings_this_week: 'இந்த வாரம்',
    earnings_this_month: 'இந்த மாதம்',
    earnings_withdraw: 'திரும்பப் பெறு',
    earnings_pending: 'நிலுவையில்',

    cart_title: 'கார்ட்',
    cart_empty: 'உங்கள் கார்ட் காலியாக உள்ளது',
    cart_checkout: 'செக்அவுட்',
    cart_total: 'மொத்தம்',
    cart_remove: 'நீக்கு',

    categories_title: 'வகைகள்',

    product_add_to_cart: 'கார்டில் சேர்',
    product_inquire: 'விசாரணை அனுப்பு',
    product_description: 'விவரம்',
    product_reviews: 'மதிப்புரைகள்',
    product_in_stock: 'கையிருப்பில் உள்ளது',
    product_sold_out: 'விற்றுவிட்டது',

    lang_picker_title: 'உங்கள் மொழியைத் தேர்வு செய்யவும்',

    common_cancel: 'ரத்து செய்',
    common_save: 'சேமி',
    common_back: 'பின்',
    common_loading: 'ஏற்றுகிறோம்…',
    common_error_retry: 'தவறு நேர்ந்தது. மீண்டும் முயற்சிக்கவும்.',
    common_no_data: 'இன்னும் ஒன்றும் இல்லை',
    common_done: 'முடிந்தது',
  },

  // ════════════════════════════════════════════════════════════════════
  te: {
    welcome_login: 'లాగిన్',
    welcome_signup: 'సైన్ అప్',
    welcome_tagline: 'చేతిపని నుండి మార్కెట్ వరకు',

    auth_phone_headline: 'మీ ఫోన్ నంబర్ నమోదు చేయండి',
    auth_phone_subtext: 'మేము మీకు OTP పంపుతాము',
    auth_phone_placeholder: 'ఫోన్ నంబర్',
    auth_phone_send_otp: 'OTP పంపు',
    auth_phone_sending: 'పంపుతున్నాము…',

    auth_otp_headline: 'OTP నమోదు చేయండి',
    auth_otp_subtext: 'మీ నంబర్‌కు పంపబడింది',
    auth_otp_verify: 'ధృవీకరించు',
    auth_otp_verifying: 'ధృవీకరిస్తున్నాము…',
    auth_otp_resend: 'OTP మళ్ళీ పంపు',

    auth_details_headline: 'మీ గురించి చెప్పండి',
    auth_details_subtext: 'ప్రారంభించడానికి మీ పేరు మాత్రమే',
    auth_details_placeholder: 'మీ పేరు',
    auth_continue: 'కొనసాగించు',

    auth_craft_headline: 'మీరు ఏమి చేస్తారు?',
    auth_craft_subtext: 'సరిపడినదాన్ని ఎంచుకోండి',
    auth_craft_other_placeholder: 'మీ చేతిపనిని వివరించండి…',

    auth_lang_headline: 'మీ భాషను ఎంచుకోండి',
    auth_lang_subtext: 'మీరు ఎప్పుడైనా మార్చవచ్చు',

    auth_scheme_headline: 'ప్రభుత్వ పథకం ID ఉందా?',
    auth_scheme_subtext: 'మీరు ధృవీకరించబడిన కళాకారుడని చూపిస్తుంది — ఐచ్ఛికం',
    auth_scheme_placeholder: 'పథకం లేదా క్లస్టర్ ID',
    auth_scheme_skip: 'ఇప్పుడు దాటవేయి',

    auth_success_headline: 'మీరు సిద్ధంగా ఉన్నారు!',
    auth_success_subtext: 'మీ కళాకారుడు ప్రొఫైల్ సిద్ధంగా ఉంది.',
    auth_success_go: 'డాష్‌బోర్డ్‌కు వెళ్ళు',

    home_greeting: 'స్వాగతం,',
    home_greeting_prompt: 'నేడు మీ చేతిపనిని ఆన్‌లైన్ చేయండి',
    home_search_placeholder: 'మీ ఉత్పత్తులను వెతకండి…',
    home_my_listings: 'నా లిస్టింగ్‌లు',
    home_see_all: 'అన్నీ చూడు →',
    home_orders_inquiries: 'ఆర్డర్లు & విచారణలు',
    home_view_all: 'అన్నీ చూడు →',
    home_your_earnings: 'మీ సంపాదన',
    home_this_month: 'ఈ నెల',
    home_growth: '↑ గత నెల కంటే 18% ఎక్కువ',
    home_view_details: 'వివరాలు చూడు →',

    stats_active_listings: 'చురుకైన లిస్టింగ్‌లు',
    stats_new_inquiries: 'కొత్త విచారణలు',
    stats_this_month: 'ఈ నెల',

    hero_add_product: 'కొత్త ఉత్పత్తి జోడించు',
    hero_add_product_sub: 'ఫోటో తీయండి, మాట్లాడండి — మిగతాది మేము చేస్తాము',
    hero_start: 'ప్రారంభించు',
    hero_earnings_sub: 'ఈ నెల సంపాదన',
    hero_view_details: 'వివరాలు చూడు',

    listings_title: 'నా లిస్టింగ్‌లు',
    listings_search_placeholder: 'లిస్టింగ్‌లు వెతకండి…',
    listings_add_product: 'ఉత్పత్తి జోడించు',
    listings_empty_title: 'లిస్టింగ్‌లు కనుగొనబడలేదు',
    listings_empty_sub: 'వేరే ఫిల్టర్ లేదా శోధన పదం ప్రయత్నించండి',
    listings_filter_all: 'అన్నీ',
    listing_status_published: 'ప్రచురించబడింది',
    listing_status_draft: 'ముసాయిదా',
    listing_status_sold: 'అమ్మబడింది',
    listing_status_inquiries: 'విచారణలు',

    add_product_title: 'కొత్త ఉత్పత్తి జోడించు',
    add_product_step_photo: 'ఫోటో',
    add_product_step_describe: 'వివరించు',
    add_product_step_price: 'ధర',
    add_product_step_publish: 'ప్రచురించు',
    add_product_take_photo: 'ఫోటో తీయి',
    add_product_upload: 'గ్యాలరీ నుండి అప్‌లోడ్ చేయి',
    add_product_title_label: 'ఉత్పత్తి పేరు',
    add_product_description_label: 'వివరణ',
    add_product_category_label: 'వర్గం',
    add_product_price_label: 'ధర నిర్ణయించండి',
    add_product_units_label: 'అందుబాటులో ఉన్న యూనిట్లు',
    add_product_publish: 'ఉత్పత్తిని ప్రచురించు',
    add_product_publishing: 'ప్రచురిస్తున్నాము…',
    add_product_next: 'తదుపరి',

    profile_title: 'ప్రొఫైల్',
    profile_edit: 'సవరించు',
    profile_craft_story: 'నా చేతిపని కథ',
    profile_edit_story: 'కథను సవరించు',
    profile_logout: 'లాగ్ అవుట్',
    profile_section_business: 'వ్యాపారం',
    profile_section_app: 'యాప్',
    profile_section_help: 'సహాయం & చట్టం',
    profile_shop_name: 'దుకాణం పేరు',
    profile_scheme_id: 'పథకం / క్లస్టర్ ID',
    profile_location: 'స్థానం',
    profile_bank_account: 'బ్యాంక్ ఖాతా',
    profile_language: 'భాష',
    profile_push_notifications: 'పుష్ నోటిఫికేషన్లు',
    profile_biometric: 'బయోమెట్రిక్ లాగిన్',
    profile_help_support: 'సహాయం & మద్దతు',
    profile_terms: 'సేవా నిబంధనలు',
    profile_privacy: 'గోప్యతా విధానం',
    profile_rate_app: 'యాప్‌ను రేట్ చేయి',
    profile_listings: 'లిస్టింగ్‌లు',
    profile_sales: 'అమ్మకాలు',
    profile_rating: 'రేటింగ్',
    profile_revenue: 'ఆదాయం',

    drawer_settings: 'సెట్టింగులు',
    drawer_help: 'సహాయం & మద్దతు',
    drawer_logout: 'లాగ్ అవుట్',
    drawer_scheme_label: 'పథకం / క్లస్టర్ ID',

    inquiries_title: 'విచారణలు',
    inquiries_empty: 'ఇంకా విచారణలు లేవు',
    inquiries_reply: 'సమాధానం',
    inquiries_accept: 'అంగీకరించు',
    inquiries_decline: 'తిరస్కరించు',
    inquiries_new: 'కొత్తది',
    inquiries_pending: 'పెండింగ్',
    inquiries_closed: 'మూసివేయబడింది',

    earnings_title: 'సంపాదన',
    earnings_total: 'మొత్తం సంపాదన',
    earnings_this_week: 'ఈ వారం',
    earnings_this_month: 'ఈ నెల',
    earnings_withdraw: 'ఉపసంహరించు',
    earnings_pending: 'పెండింగ్',

    cart_title: 'కార్ట్',
    cart_empty: 'మీ కార్ట్ ఖాళీగా ఉంది',
    cart_checkout: 'చెక్అవుట్',
    cart_total: 'మొత్తం',
    cart_remove: 'తొలగించు',

    categories_title: 'వర్గాలు',

    product_add_to_cart: 'కార్ట్‌కు జోడించు',
    product_inquire: 'విచారణ పంపు',
    product_description: 'వివరణ',
    product_reviews: 'సమీక్షలు',
    product_in_stock: 'స్టాక్‌లో ఉంది',
    product_sold_out: 'అమ్ముడైంది',

    lang_picker_title: 'మీ భాషను ఎంచుకోండి',

    common_cancel: 'రద్దు చేయి',
    common_save: 'సేవ్ చేయి',
    common_back: 'వెనక్కు',
    common_loading: 'లోడ్ అవుతోంది…',
    common_error_retry: 'లోపం జరిగింది. మళ్ళీ ప్రయత్నించండి.',
    common_no_data: 'ఇంకా ఏమీ లేదు',
    common_done: 'పూర్తయింది',
  },

  // ════════════════════════════════════════════════════════════════════
  bn: {
    welcome_login: 'লগইন',
    welcome_signup: 'সাইন আপ',
    welcome_tagline: 'হস্তশিল্প থেকে বাজার পর্যন্ত',

    auth_phone_headline: 'আপনার ফোন নম্বর দিন',
    auth_phone_subtext: 'আমরা আপনাকে একটি OTP পাঠাব',
    auth_phone_placeholder: 'ফোন নম্বর',
    auth_phone_send_otp: 'OTP পাঠান',
    auth_phone_sending: 'পাঠাচ্ছি…',

    auth_otp_headline: 'OTP দিন',
    auth_otp_subtext: 'আপনার নম্বরে পাঠানো হয়েছে',
    auth_otp_verify: 'যাচাই করুন',
    auth_otp_verifying: 'যাচাই হচ্ছে…',
    auth_otp_resend: 'OTP আবার পাঠান',

    auth_details_headline: 'নিজের সম্পর্কে বলুন',
    auth_details_subtext: 'শুরু করতে শুধু আপনার নাম',
    auth_details_placeholder: 'আপনার নাম',
    auth_continue: 'চালিয়ে যান',

    auth_craft_headline: 'আপনি কী তৈরি করেন?',
    auth_craft_subtext: 'সবচেয়ে উপযুক্তটি বেছে নিন',
    auth_craft_other_placeholder: 'আপনার শিল্পকলা বর্ণনা করুন…',

    auth_lang_headline: 'আপনার ভাষা বেছে নিন',
    auth_lang_subtext: 'আপনি যেকোনো সময় পরিবর্তন করতে পারবেন',

    auth_scheme_headline: 'সরকারি প্রকল্প ID আছে?',
    auth_scheme_subtext: 'ক্রেতারা দেখতে পাবেন আপনি যাচাইকৃত কারিগর — ঐচ্ছিক',
    auth_scheme_placeholder: 'প্রকল্প বা ক্লাস্টার ID',
    auth_scheme_skip: 'এখন এড়িয়ে যান',

    auth_success_headline: 'আপনি প্রস্তুত!',
    auth_success_subtext: 'আপনার কারিগর প্রোফাইল তৈরি।',
    auth_success_go: 'ড্যাশবোর্ডে যান',

    home_greeting: 'স্বাগতম,',
    home_greeting_prompt: 'আজই আপনার শিল্পকলা অনলাইনে আনুন',
    home_search_placeholder: 'পণ্য খুঁজুন…',
    home_my_listings: 'আমার তালিকা',
    home_see_all: 'সব দেখুন →',
    home_orders_inquiries: 'অর্ডার ও জিজ্ঞাসা',
    home_view_all: 'সব দেখুন →',
    home_your_earnings: 'আপনার আয়',
    home_this_month: 'এই মাসে',
    home_growth: '↑ গত মাস থেকে ১৮% বেশি',
    home_view_details: 'বিস্তারিত দেখুন →',

    stats_active_listings: 'সক্রিয় তালিকা',
    stats_new_inquiries: 'নতুন জিজ্ঞাসা',
    stats_this_month: 'এই মাসে',

    hero_add_product: 'নতুন পণ্য যোগ করুন',
    hero_add_product_sub: 'ছবি তুলুন, বলুন — বাকি আমরা করব',
    hero_start: 'শুরু করুন',
    hero_earnings_sub: 'এই মাসের আয়',
    hero_view_details: 'বিস্তারিত দেখুন',

    listings_title: 'আমার তালিকা',
    listings_search_placeholder: 'তালিকা খুঁজুন…',
    listings_add_product: 'পণ্য যোগ করুন',
    listings_empty_title: 'কোনো তালিকা পাওয়া যায়নি',
    listings_empty_sub: 'অন্য ফিল্টার বা অনুসন্ধান শব্দ ব্যবহার করুন',
    listings_filter_all: 'সব',
    listing_status_published: 'প্রকাশিত',
    listing_status_draft: 'খসড়া',
    listing_status_sold: 'বিক্রিত',
    listing_status_inquiries: 'জিজ্ঞাসা',

    add_product_title: 'নতুন পণ্য যোগ করুন',
    add_product_step_photo: 'ছবি',
    add_product_step_describe: 'বর্ণনা',
    add_product_step_price: 'দাম',
    add_product_step_publish: 'প্রকাশ',
    add_product_take_photo: 'ছবি তুলুন',
    add_product_upload: 'গ্যালারি থেকে আপলোড',
    add_product_title_label: 'পণ্যের নাম',
    add_product_description_label: 'বিবরণ',
    add_product_category_label: 'বিভাগ',
    add_product_price_label: 'দাম নির্ধারণ করুন',
    add_product_units_label: 'উপলব্ধ ইউনিট',
    add_product_publish: 'পণ্য প্রকাশ করুন',
    add_product_publishing: 'প্রকাশ হচ্ছে…',
    add_product_next: 'পরবর্তী',

    profile_title: 'প্রোফাইল',
    profile_edit: 'সম্পাদনা',
    profile_craft_story: 'আমার শিল্পকলার গল্প',
    profile_edit_story: 'গল্প সম্পাদনা করুন',
    profile_logout: 'লগ আউট',
    profile_section_business: 'ব্যবসা',
    profile_section_app: 'অ্যাপ',
    profile_section_help: 'সাহায্য ও আইনি',
    profile_shop_name: 'দোকানের নাম',
    profile_scheme_id: 'প্রকল্প / ক্লাস্টার ID',
    profile_location: 'অবস্থান',
    profile_bank_account: 'ব্যাংক অ্যাকাউন্ট',
    profile_language: 'ভাষা',
    profile_push_notifications: 'পুশ বিজ্ঞপ্তি',
    profile_biometric: 'বায়োমেট্রিক লগইন',
    profile_help_support: 'সাহায্য ও সহায়তা',
    profile_terms: 'সেবার শর্তাবলী',
    profile_privacy: 'গোপনীয়তা নীতি',
    profile_rate_app: 'অ্যাপ রেট করুন',
    profile_listings: 'তালিকা',
    profile_sales: 'বিক্রয়',
    profile_rating: 'রেটিং',
    profile_revenue: 'রাজস্ব',

    drawer_settings: 'সেটিংস',
    drawer_help: 'সাহায্য ও সহায়তা',
    drawer_logout: 'লগ আউট',
    drawer_scheme_label: 'প্রকল্প / ক্লাস্টার ID',

    inquiries_title: 'জিজ্ঞাসা',
    inquiries_empty: 'এখনো কোনো জিজ্ঞাসা নেই',
    inquiries_reply: 'উত্তর দিন',
    inquiries_accept: 'গ্রহণ করুন',
    inquiries_decline: 'প্রত্যাখ্যান করুন',
    inquiries_new: 'নতুন',
    inquiries_pending: 'মুলতবি',
    inquiries_closed: 'বন্ধ',

    earnings_title: 'আয়',
    earnings_total: 'মোট আয়',
    earnings_this_week: 'এই সপ্তাহ',
    earnings_this_month: 'এই মাসে',
    earnings_withdraw: 'উত্তোলন',
    earnings_pending: 'মুলতবি',

    cart_title: 'কার্ট',
    cart_empty: 'আপনার কার্ট খালি',
    cart_checkout: 'চেকআউট',
    cart_total: 'মোট',
    cart_remove: 'সরান',

    categories_title: 'বিভাগসমূহ',

    product_add_to_cart: 'কার্টে যোগ করুন',
    product_inquire: 'জিজ্ঞাসা পাঠান',
    product_description: 'বিবরণ',
    product_reviews: 'পর্যালোচনা',
    product_in_stock: 'স্টকে আছে',
    product_sold_out: 'বিক্রি শেষ',

    lang_picker_title: 'আপনার ভাষা বেছে নিন',

    common_cancel: 'বাতিল',
    common_save: 'সংরক্ষণ',
    common_back: 'ফিরে যান',
    common_loading: 'লোড হচ্ছে…',
    common_error_retry: 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।',
    common_no_data: 'এখনো কিছু নেই',
    common_done: 'সম্পন্ন',
  },

  // ════════════════════════════════════════════════════════════════════
  pa: {
    welcome_login: 'ਲਾਗਇਨ',
    welcome_signup: 'ਸਾਈਨ ਅੱਪ',
    welcome_tagline: 'ਦਸਤਕਾਰੀ ਤੋਂ ਬਾਜ਼ਾਰ ਤੱਕ',

    auth_phone_headline: 'ਆਪਣਾ ਫ਼ੋਨ ਨੰਬਰ ਦਰਜ ਕਰੋ',
    auth_phone_subtext: 'ਅਸੀਂ ਤੁਹਾਨੂੰ OTP ਭੇਜਾਂਗੇ',
    auth_phone_placeholder: 'ਫ਼ੋਨ ਨੰਬਰ',
    auth_phone_send_otp: 'OTP ਭੇਜੋ',
    auth_phone_sending: 'ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…',

    auth_otp_headline: 'OTP ਦਰਜ ਕਰੋ',
    auth_otp_subtext: 'ਤੁਹਾਡੇ ਨੰਬਰ ਤੇ ਭੇਜਿਆ ਗਿਆ',
    auth_otp_verify: 'ਤਸਦੀਕ ਕਰੋ',
    auth_otp_verifying: 'ਤਸਦੀਕ ਹੋ ਰਹੀ ਹੈ…',
    auth_otp_resend: 'OTP ਦੁਬਾਰਾ ਭੇਜੋ',

    auth_details_headline: 'ਆਪਣੇ ਬਾਰੇ ਦੱਸੋ',
    auth_details_subtext: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਬੱਸ ਆਪਣਾ ਨਾਮ',
    auth_details_placeholder: 'ਤੁਹਾਡਾ ਨਾਮ',
    auth_continue: 'ਜਾਰੀ ਰੱਖੋ',

    auth_craft_headline: 'ਤੁਸੀਂ ਕੀ ਬਣਾਉਂਦੇ ਹੋ?',
    auth_craft_subtext: 'ਜੋ ਸਭ ਤੋਂ ਅਨੁਕੂਲ ਲੱਗੇ ਚੁਣੋ',
    auth_craft_other_placeholder: 'ਆਪਣੀ ਦਸਤਕਾਰੀ ਦੱਸੋ…',

    auth_lang_headline: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
    auth_lang_subtext: 'ਤੁਸੀਂ ਕਦੇ ਵੀ ਬਦਲ ਸਕਦੇ ਹੋ',

    auth_scheme_headline: 'ਕੀ ਸਰਕਾਰੀ ਯੋਜਨਾ ID ਹੈ?',
    auth_scheme_subtext: 'ਖਰੀਦਦਾਰਾਂ ਨੂੰ ਦਿਖਾਉਂਦਾ ਹੈ ਕਿ ਤੁਸੀਂ ਤਸਦੀਕਸ਼ੁਦਾ ਕਾਰੀਗਰ ਹੋ — ਵਿਕਲਪਿਕ',
    auth_scheme_placeholder: 'ਯੋਜਨਾ ਜਾਂ ਕਲੱਸਟਰ ID',
    auth_scheme_skip: 'ਹੁਣ ਛੱਡੋ',

    auth_success_headline: 'ਤੁਸੀਂ ਤਿਆਰ ਹੋ!',
    auth_success_subtext: 'ਤੁਹਾਡੀ ਕਾਰੀਗਰ ਪ੍ਰੋਫਾਈਲ ਤਿਆਰ ਹੈ।',
    auth_success_go: 'ਡੈਸ਼ਬੋਰਡ ਤੇ ਜਾਓ',

    home_greeting: 'ਜੀ ਆਇਆਂ ਨੂੰ,',
    home_greeting_prompt: 'ਅੱਜ ਆਪਣੀ ਦਸਤਕਾਰੀ ਔਨਲਾਈਨ ਕਰੋ',
    home_search_placeholder: 'ਉਤਪਾਦ ਖੋਜੋ…',
    home_my_listings: 'ਮੇਰੀਆਂ ਸੂਚੀਆਂ',
    home_see_all: 'ਸਭ ਦੇਖੋ →',
    home_orders_inquiries: 'ਆਰਡਰ ਅਤੇ ਪੁੱਛਗਿੱਛ',
    home_view_all: 'ਸਭ ਦੇਖੋ →',
    home_your_earnings: 'ਤੁਹਾਡੀ ਕਮਾਈ',
    home_this_month: 'ਇਸ ਮਹੀਨੇ',
    home_growth: '↑ ਪਿਛਲੇ ਮਹੀਨੇ ਨਾਲੋਂ 18% ਵੱਧ',
    home_view_details: 'ਵੇਰਵੇ ਦੇਖੋ →',

    stats_active_listings: 'ਸਰਗਰਮ ਸੂਚੀਆਂ',
    stats_new_inquiries: 'ਨਵੀਆਂ ਪੁੱਛਗਿੱਛਾਂ',
    stats_this_month: 'ਇਸ ਮਹੀਨੇ',

    hero_add_product: 'ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ',
    hero_add_product_sub: 'ਫ਼ੋਟੋ ਲਓ, ਬੋਲੋ — ਬਾਕੀ ਅਸੀਂ ਕਰਾਂਗੇ',
    hero_start: 'ਸ਼ੁਰੂ ਕਰੋ',
    hero_earnings_sub: 'ਇਸ ਮਹੀਨੇ ਦੀ ਕਮਾਈ',
    hero_view_details: 'ਵੇਰਵੇ ਦੇਖੋ',

    listings_title: 'ਮੇਰੀਆਂ ਸੂਚੀਆਂ',
    listings_search_placeholder: 'ਸੂਚੀਆਂ ਖੋਜੋ…',
    listings_add_product: 'ਉਤਪਾਦ ਜੋੜੋ',
    listings_empty_title: 'ਕੋਈ ਸੂਚੀ ਨਹੀਂ ਮਿਲੀ',
    listings_empty_sub: 'ਕੋਈ ਹੋਰ ਫ਼ਿਲਟਰ ਜਾਂ ਖੋਜ ਸ਼ਬਦ ਅਜ਼ਮਾਓ',
    listings_filter_all: 'ਸਭ',
    listing_status_published: 'ਪ੍ਰਕਾਸ਼ਿਤ',
    listing_status_draft: 'ਡ੍ਰਾਫਟ',
    listing_status_sold: 'ਵਿਕਿਆ',
    listing_status_inquiries: 'ਪੁੱਛਗਿੱਛਾਂ',

    add_product_title: 'ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ',
    add_product_step_photo: 'ਫ਼ੋਟੋ',
    add_product_step_describe: 'ਵੇਰਵਾ',
    add_product_step_price: 'ਕੀਮਤ',
    add_product_step_publish: 'ਪ੍ਰਕਾਸ਼ਿਤ',
    add_product_take_photo: 'ਫ਼ੋਟੋ ਲਓ',
    add_product_upload: 'ਗੈਲਰੀ ਤੋਂ ਅਪਲੋਡ ਕਰੋ',
    add_product_title_label: 'ਉਤਪਾਦ ਦਾ ਨਾਮ',
    add_product_description_label: 'ਵੇਰਵਾ',
    add_product_category_label: 'ਸ਼੍ਰੇਣੀ',
    add_product_price_label: 'ਕੀਮਤ ਨਿਰਧਾਰਤ ਕਰੋ',
    add_product_units_label: 'ਉਪਲਬਧ ਇਕਾਈਆਂ',
    add_product_publish: 'ਉਤਪਾਦ ਪ੍ਰਕਾਸ਼ਿਤ ਕਰੋ',
    add_product_publishing: 'ਪ੍ਰਕਾਸ਼ਿਤ ਹੋ ਰਿਹਾ ਹੈ…',
    add_product_next: 'ਅਗਲਾ',

    profile_title: 'ਪ੍ਰੋਫਾਈਲ',
    profile_edit: 'ਸੰਪਾਦਿਤ ਕਰੋ',
    profile_craft_story: 'ਮੇਰੀ ਦਸਤਕਾਰੀ ਕਹਾਣੀ',
    profile_edit_story: 'ਕਹਾਣੀ ਸੰਪਾਦਿਤ ਕਰੋ',
    profile_logout: 'ਲਾਗ ਆਊਟ',
    profile_section_business: 'ਕਾਰੋਬਾਰ',
    profile_section_app: 'ਐਪ',
    profile_section_help: 'ਮਦਦ ਅਤੇ ਕਾਨੂੰਨੀ',
    profile_shop_name: 'ਦੁਕਾਨ ਦਾ ਨਾਮ',
    profile_scheme_id: 'ਯੋਜਨਾ / ਕਲੱਸਟਰ ID',
    profile_location: 'ਸਥਾਨ',
    profile_bank_account: 'ਬੈਂਕ ਖਾਤਾ',
    profile_language: 'ਭਾਸ਼ਾ',
    profile_push_notifications: 'ਪੁਸ਼ ਸੂਚਨਾਵਾਂ',
    profile_biometric: 'ਬਾਇਓਮੈਟ੍ਰਿਕ ਲਾਗਇਨ',
    profile_help_support: 'ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ',
    profile_terms: 'ਸੇਵਾ ਦੀਆਂ ਸ਼ਰਤਾਂ',
    profile_privacy: 'ਗੋਪਨੀਯਤਾ ਨੀਤੀ',
    profile_rate_app: 'ਐਪ ਨੂੰ ਰੇਟ ਕਰੋ',
    profile_listings: 'ਸੂਚੀਆਂ',
    profile_sales: 'ਵਿਕਰੀ',
    profile_rating: 'ਰੇਟਿੰਗ',
    profile_revenue: 'ਆਮਦਨ',

    drawer_settings: 'ਸੈਟਿੰਗਾਂ',
    drawer_help: 'ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ',
    drawer_logout: 'ਲਾਗ ਆਊਟ',
    drawer_scheme_label: 'ਯੋਜਨਾ / ਕਲੱਸਟਰ ID',

    inquiries_title: 'ਪੁੱਛਗਿੱਛਾਂ',
    inquiries_empty: 'ਅਜੇ ਕੋਈ ਪੁੱਛਗਿੱਛ ਨਹੀਂ',
    inquiries_reply: 'ਜਵਾਬ ਦਿਓ',
    inquiries_accept: 'ਸਵੀਕਾਰ ਕਰੋ',
    inquiries_decline: 'ਅਸਵੀਕਾਰ ਕਰੋ',
    inquiries_new: 'ਨਵੀਂ',
    inquiries_pending: 'ਲੰਬਿਤ',
    inquiries_closed: 'ਬੰਦ',

    earnings_title: 'ਕਮਾਈ',
    earnings_total: 'ਕੁੱਲ ਕਮਾਈ',
    earnings_this_week: 'ਇਸ ਹਫ਼ਤੇ',
    earnings_this_month: 'ਇਸ ਮਹੀਨੇ',
    earnings_withdraw: 'ਕਢਵਾਓ',
    earnings_pending: 'ਲੰਬਿਤ',

    cart_title: 'ਕਾਰਟ',
    cart_empty: 'ਤੁਹਾਡਾ ਕਾਰਟ ਖਾਲੀ ਹੈ',
    cart_checkout: 'ਚੈੱਕਆਊਟ',
    cart_total: 'ਕੁੱਲ',
    cart_remove: 'ਹਟਾਓ',

    categories_title: 'ਸ਼੍ਰੇਣੀਆਂ',

    product_add_to_cart: 'ਕਾਰਟ ਵਿੱਚ ਜੋੜੋ',
    product_inquire: 'ਪੁੱਛਗਿੱਛ ਭੇਜੋ',
    product_description: 'ਵੇਰਵਾ',
    product_reviews: 'ਸਮੀਖਿਆਵਾਂ',
    product_in_stock: 'ਸਟਾਕ ਵਿੱਚ ਹੈ',
    product_sold_out: 'ਵਿਕ ਗਿਆ',

    lang_picker_title: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',

    common_cancel: 'ਰੱਦ ਕਰੋ',
    common_save: 'ਸੁਰੱਖਿਅਤ ਕਰੋ',
    common_back: 'ਵਾਪਸ',
    common_loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
    common_error_retry: 'ਕੁਝ ਗਲਤ ਹੋਇਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    common_no_data: 'ਅਜੇ ਇੱਥੇ ਕੁਝ ਨਹੀਂ',
    common_done: 'ਹੋ ਗਿਆ',
  },

  // ════════════════════════════════════════════════════════════════════
  mr: {
    welcome_login: 'लॉगिन',
    welcome_signup: 'साइन अप',
    welcome_tagline: 'हस्तकला ते बाजार',

    auth_phone_headline: 'तुमचा फोन नंबर टाका',
    auth_phone_subtext: 'आम्ही तुम्हाला OTP पाठवू',
    auth_phone_placeholder: 'फोन नंबर',
    auth_phone_send_otp: 'OTP पाठवा',
    auth_phone_sending: 'पाठवत आहोत…',

    auth_otp_headline: 'OTP टाका',
    auth_otp_subtext: 'तुमच्या नंबरवर पाठवला आहे',
    auth_otp_verify: 'पडताळणी करा',
    auth_otp_verifying: 'पडताळणी होत आहे…',
    auth_otp_resend: 'OTP पुन्हा पाठवा',

    auth_details_headline: 'स्वतःबद्दल सांगा',
    auth_details_subtext: 'सुरुवातीसाठी फक्त तुमचे नाव',
    auth_details_placeholder: 'तुमचे नाव',
    auth_continue: 'पुढे जा',

    auth_craft_headline: 'तुम्ही काय बनवता?',
    auth_craft_subtext: 'सर्वात योग्य ते निवडा',
    auth_craft_other_placeholder: 'तुमची हस्तकला सांगा…',

    auth_lang_headline: 'तुमची भाषा निवडा',
    auth_lang_subtext: 'तुम्ही कधीही बदलू शकता',

    auth_scheme_headline: 'सरकारी योजना ID आहे का?',
    auth_scheme_subtext: 'खरेदीदारांना दाखवते की तुम्ही प्रमाणित कारागीर आहात — पर्यायी',
    auth_scheme_placeholder: 'योजना किंवा क्लस्टर ID',
    auth_scheme_skip: 'आत्ता वगळा',

    auth_success_headline: 'तुम्ही तयार आहात!',
    auth_success_subtext: 'तुमचे कारागीर प्रोफाइल तयार आहे.',
    auth_success_go: 'डॅशबोर्डवर जा',

    home_greeting: 'स्वागत आहे,',
    home_greeting_prompt: 'आज तुमची हस्तकला ऑनलाइन करा',
    home_search_placeholder: 'उत्पादने शोधा…',
    home_my_listings: 'माझ्या सूची',
    home_see_all: 'सर्व पाहा →',
    home_orders_inquiries: 'ऑर्डर आणि चौकशी',
    home_view_all: 'सर्व पाहा →',
    home_your_earnings: 'तुमची कमाई',
    home_this_month: 'या महिन्यात',
    home_growth: '↑ गेल्या महिन्यापेक्षा 18% जास्त',
    home_view_details: 'तपशील पाहा →',

    stats_active_listings: 'सक्रिय सूची',
    stats_new_inquiries: 'नव्या चौकशी',
    stats_this_month: 'या महिन्यात',

    hero_add_product: 'नवीन उत्पादन जोडा',
    hero_add_product_sub: 'फोटो घ्या, बोला — बाकी आम्ही करू',
    hero_start: 'सुरू करा',
    hero_earnings_sub: 'या महिन्याची कमाई',
    hero_view_details: 'तपशील पाहा',

    listings_title: 'माझ्या सूची',
    listings_search_placeholder: 'सूची शोधा…',
    listings_add_product: 'उत्पादन जोडा',
    listings_empty_title: 'कोणत्याही सूची सापडल्या नाहीत',
    listings_empty_sub: 'वेगळा फिल्टर किंवा शोध शब्द वापरा',
    listings_filter_all: 'सर्व',
    listing_status_published: 'प्रकाशित',
    listing_status_draft: 'मसुदा',
    listing_status_sold: 'विकलेले',
    listing_status_inquiries: 'चौकशी',

    add_product_title: 'नवीन उत्पादन जोडा',
    add_product_step_photo: 'फोटो',
    add_product_step_describe: 'वर्णन',
    add_product_step_price: 'किंमत',
    add_product_step_publish: 'प्रकाशित',
    add_product_take_photo: 'फोटो घ्या',
    add_product_upload: 'गॅलरीतून अपलोड करा',
    add_product_title_label: 'उत्पादनाचे नाव',
    add_product_description_label: 'वर्णन',
    add_product_category_label: 'श्रेणी',
    add_product_price_label: 'किंमत ठरवा',
    add_product_units_label: 'उपलब्ध युनिट',
    add_product_publish: 'उत्पादन प्रकाशित करा',
    add_product_publishing: 'प्रकाशित होत आहे…',
    add_product_next: 'पुढे',

    profile_title: 'प्रोफाइल',
    profile_edit: 'संपादित करा',
    profile_craft_story: 'माझी हस्तकला कथा',
    profile_edit_story: 'कथा संपादित करा',
    profile_logout: 'लॉग आउट',
    profile_section_business: 'व्यवसाय',
    profile_section_app: 'ॲप',
    profile_section_help: 'मदत आणि कायदेशीर',
    profile_shop_name: 'दुकानाचे नाव',
    profile_scheme_id: 'योजना / क्लस्टर ID',
    profile_location: 'स्थान',
    profile_bank_account: 'बँक खाते',
    profile_language: 'भाषा',
    profile_push_notifications: 'पुश सूचना',
    profile_biometric: 'बायोमेट्रिक लॉगिन',
    profile_help_support: 'मदत आणि समर्थन',
    profile_terms: 'सेवा अटी',
    profile_privacy: 'गोपनीयता धोरण',
    profile_rate_app: 'ॲपला रेट करा',
    profile_listings: 'सूची',
    profile_sales: 'विक्री',
    profile_rating: 'रेटिंग',
    profile_revenue: 'महसूल',

    drawer_settings: 'सेटिंग्ज',
    drawer_help: 'मदत आणि समर्थन',
    drawer_logout: 'लॉग आउट',
    drawer_scheme_label: 'योजना / क्लस्टर ID',

    inquiries_title: 'चौकशी',
    inquiries_empty: 'अद्याप कोणतीही चौकशी नाही',
    inquiries_reply: 'उत्तर द्या',
    inquiries_accept: 'स्वीकारा',
    inquiries_decline: 'नाकारा',
    inquiries_new: 'नवीन',
    inquiries_pending: 'प्रलंबित',
    inquiries_closed: 'बंद',

    earnings_title: 'कमाई',
    earnings_total: 'एकूण कमाई',
    earnings_this_week: 'या आठवड्यात',
    earnings_this_month: 'या महिन्यात',
    earnings_withdraw: 'काढा',
    earnings_pending: 'प्रलंबित',

    cart_title: 'कार्ट',
    cart_empty: 'तुमचा कार्ट रिकामा आहे',
    cart_checkout: 'चेकआउट',
    cart_total: 'एकूण',
    cart_remove: 'काढा',

    categories_title: 'श्रेण्या',

    product_add_to_cart: 'कार्टमध्ये जोडा',
    product_inquire: 'चौकशी पाठवा',
    product_description: 'वर्णन',
    product_reviews: 'पुनरावलोकने',
    product_in_stock: 'साठ्यात आहे',
    product_sold_out: 'विकले गेले',

    lang_picker_title: 'तुमची भाषा निवडा',

    common_cancel: 'रद्द करा',
    common_save: 'जतन करा',
    common_back: 'मागे',
    common_loading: 'लोड होत आहे…',
    common_error_retry: 'काहीतरी चुकले. पुन्हा प्रयत्न करा.',
    common_no_data: 'अद्याप इथे काहीही नाही',
    common_done: 'झाले',
  },
};

export const LANGUAGE_META: Record<LanguageCode, { label: string; native: string; short: string }> = {
  en: { label: 'English',  native: 'English',  short: 'EN' },
  hi: { label: 'Hindi',    native: 'हिन्दी',   short: 'हिं' },
  ta: { label: 'Tamil',    native: 'தமிழ்',   short: 'த' },
  te: { label: 'Telugu',   native: 'తెలుగు',  short: 'తె' },
  bn: { label: 'Bengali',  native: 'বাংলা',   short: 'বা' },
  pa: { label: 'Punjabi',  native: 'ਪੰਜਾਬੀ',  short: 'ਪੰ' },
  mr: { label: 'Marathi',  native: 'मराठी',   short: 'म' },
};
