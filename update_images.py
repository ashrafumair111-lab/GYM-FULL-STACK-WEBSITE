import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='umair222', database='gym_store')
cur = conn.cursor()

images = {
    1: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=400&fit=crop',
    2: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=600&h=400&fit=crop',
    3: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=400&fit=crop',
    4: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&h=400&fit=crop',
    5: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=400&fit=crop',
    6: 'https://images.unsplash.com/photo-1622484211151-3c0b29a3d1c8?w=600&h=400&fit=crop',
    7: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop',
    8: 'https://images.unsplash.com/photo-1622445275576-721325763afe?w=600&h=400&fit=crop',
}

for pid, url in images.items():
    cur.execute("UPDATE products SET image_url=%s WHERE id=%s", (url, pid))
    print(f"  Updated product {pid}: {cur.rowcount} row(s)")

conn.commit()

# Verify
cur.execute("SELECT id, name, LEFT(image_url, 50) as img FROM products")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} -> {row[2]}")

cur.close()
conn.close()
print("Done!")