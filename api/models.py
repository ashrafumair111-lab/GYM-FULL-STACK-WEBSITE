from django.db import models

class User(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=190, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=[('customer','customer'),('admin','admin')], default='customer')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'users'
        managed = False

class Product(models.Model):
    name = models.CharField(max_length=180)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    image_url = models.CharField(max_length=500, default='')
    category = models.CharField(max_length=20, choices=[
        ('equipment','Equipment'),('apparel','Apparel'),
        ('supplements','Supplements'),('accessories','Accessories')])
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'products'
        managed = False

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='pending')
    shipping_address = models.CharField(max_length=500, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'orders'
        managed = False

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, db_column='product_id')
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        db_table = 'order_items'
        managed = False