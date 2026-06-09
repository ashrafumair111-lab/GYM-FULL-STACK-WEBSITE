from django.urls import re_path
from api.views import api
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # All /api/* routes go to the api view
    re_path(r'^api/.*$', api),
    # Everything else — serve static frontend files via the api view
    re_path(r'^(?!api/).*$', api),
]