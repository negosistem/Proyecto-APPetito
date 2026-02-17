import requests
import sys

BASE_URL = "http://localhost:8000"

def test_flow():
    print("Testing Staff Module Flow...")
    
    # 1. Login as Admin
    # Adjust credentials if needed. Assuming 'admin' user exists from user request 'borra todos...'
    # If standard seed was admin/admin123 or similar.
    # From recent 'list_users.py' (checking db state), we have users.
    # The 'reset_users.py' created 'carlos@appetito.com' / 'admin123' as admin.
    
    login_data = {
        "username": "carlos@appetito.com",
        "password": "password123" # Check create_random_user.py or reset script for password
    }
    
    # Actually, I don't know the password of the admin created by 'reset' script if I didn't see it.
    # The previous conversation said "He creado un script para borrar...". 
    # Let's assume 'password123' or 'admin123'. 
    # Or I can use 'create_test_user.py' logic.
    
    # Let's try to get token
    try:
        response = requests.post(f"{BASE_URL}/token", data=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            # Try 'admin123'
            login_data["password"] = "admin123"
            response = requests.post(f"{BASE_URL}/token", data=login_data)
        
        if response.status_code != 200:
            print(f"Login failed again: {response.text}")
            return

        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
        
        # 2. List Roles
        print("\nListing Roles...")
        r = requests.get(f"{BASE_URL}/roles/", headers=headers)
        if r.status_code == 200:
            roles = r.json()
            print(f"Roles found: {len(roles)}")
            for role in roles:
                print(f" - {role['name']} (id={role['id']})")
        else:
            print(f"Failed to list roles: {r.status_code}")
            return

        # 3. Create New Role
        print("\nCreating 'Security' Role...")
        new_role = {
            "name": "seguridad",
            "description": "Personal de seguridad",
            "is_active": True
        }
        r = requests.post(f"{BASE_URL}/roles/", json=new_role, headers=headers)
        if r.status_code == 201:
            sec_role = r.json()
            print(f"Role created: {sec_role['name']} (id={sec_role['id']})")
            sec_role_id = sec_role['id']
        elif r.status_code == 400 and "ya existe" in r.text:
            print("Role 'seguridad' already exists, finding it...")
            # find usage in list
            sec_role_id = next((x['id'] for x in roles if x['name'] == 'seguridad'), None)
            if not sec_role_id:
                # refresh list
                 roles = requests.get(f"{BASE_URL}/roles/", headers=headers).json()
                 sec_role_id = next((x['id'] for x in roles if x['name'] == 'seguridad'), None)
        else:
            print(f"Failed to create role: {r.status_code} {r.text}")
            return

        # 4. Create Staff Member
        print("\nCreating Staff Member 'Guardia 1'...")
        new_staff = {
            "nombre": "Guardia Uno",
            "email": "guardia1@appetito.com",
            "password": "securepassword",
            "role_id": sec_role_id,
            "turno": "Noche",
            "is_active": True
        }
        r = requests.post(f"{BASE_URL}/staff/", json=new_staff, headers=headers)
        if r.status_code == 201:
            staff_member = r.json()
            print(f"Staff created: {staff_member['nombre']} ({staff_member['email']}) - Role: {staff_member['role']['name']}")
        elif r.status_code == 400 and "ya registrado" in r.text:
            print("Staff member already exists.")
        else:
            print(f"Failed to create staff: {r.text}")
            
        # 5. Get Stats
        print("\nGetting Staff Stats...")
        r = requests.get(f"{BASE_URL}/staff/stats", headers=headers)
        if r.status_code == 200:
            stats = r.json()
            print(f"Total Staff: {stats['total']}")
            print(f"By Role: {stats['by_role']}")
        else:
            print(f"Failed to get stats: {r.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_flow()
