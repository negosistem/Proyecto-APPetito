import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, database='appetito_db', user='postgres', password='0318')
cur = conn.cursor()

# Try querying with UPPERCASE
cur.execute("SELECT id, status FROM orders WHERE id = 89")
row = cur.fetchone()
print('Order 89:', row)

# Check if payment already exists for this order
cur.execute("SELECT id, invoice_number FROM payments WHERE order_id = 89")
payment = cur.fetchone()
print('Existing payment:', payment)

# Check PaymentMethod enum values
cur.execute("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='paymentmethod') ORDER BY enumsortorder")
print('\nDB PaymentMethod enum values:')
for row in cur.fetchall():
    print(' ', row[0])

conn.close()
