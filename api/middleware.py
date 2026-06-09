class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        response = self.get_response(request)
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET,POST,PATCH,DELETE,OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        if request.method == 'OPTIONS':
            response.status_code = 204
        return response