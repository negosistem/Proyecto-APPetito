import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_create_empty_order():
    # 1. Login to get token
    login_data = {
        "username": "teste@gmail.com",
        "password": "12345678" 
    }
    
    # Try login
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print(f"Login error (server might be down?): {e}")
        return

    # 2. Get a free table
    tables_resp = requests.get(f"{BASE_URL}/api/tables", headers=headers)
    tables = tables_resp.json()
    free_table = next((t for t in tables if t["status"] == "libre"), None)
    
    if not free_table:
        print("No free tables found to test.")
        return

    print(f"Testing with Table ID: {free_table['id']} (Number: {free_table['number']})")

    # 3. Create Empty Order
    order_payload = {
        "table_id": free_table['id'],
        "customer_name": "Test Empty Order",
        "items": [] # EMPTY LIST
    }

    print("Sending Order Create Request...")
    resp = requests.post(f"{BASE_URL}/api/orders/", json=order_payload, headers=headers)
    
    if resp.status_code == 201:
        order = resp.json()
        print(f"SUCCESS! Order created. ID: {order['id']}")
        print(f"Status: {order['status']} (Expected: pending)")
        if order['status'] == 'pending':
            print("Status Check: PASS")
        else:
            print(f"Status Check: FAIL (Got {order['status']})")
    else:
        print(f"FAILED. Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_create_empty_order()
