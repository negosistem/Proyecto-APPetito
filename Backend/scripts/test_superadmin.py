"""
Script para probar endpoints del Super Admin
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
import json
from pprint import pprint

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login como Super Admin"""
    print("\n" + "="*70)
    print("1️⃣  LOGIN COMO SUPER ADMIN")
    print("="*70)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": "admin@appetito.com",
                "password": "admin123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login exitoso")
            print(f"📧 Email: {data.get('email')}")
            print(f"🎭 Rol: {data.get('role', {}).get('name')}")
            print(f"🏢 Empresa: {data.get('id_empresa', 'NULL (Super Admin)')}")
            print(f"🔐 Token: {data.get('access_token')[:50]}...")
            return data.get('access_token')
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("\n⚠️  Asegúrate de que el backend esté corriendo:")
        print("   uvicorn app.main:app --reload")
        return None


def test_list_companies(token):
    """Test listar empresas"""
    print("\n" + "="*70)
    print("2️⃣  LISTAR TODAS LAS EMPRESAS")
    print("="*70)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/superadmin/companies",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            companies = response.json()
            print(f"✅ Encontradas {len(companies)} empresas:")
            for company in companies:
                print(f"\n📊 {company['name']} (ID: {company['id']})")
                print(f"   📧 {company['email']}")
                print(f"   📈 Estado: {company['subscription_status']}")
                print(f"   👥 Usuarios: {company.get('active_users_count', 0)}/{company['max_users']}")
                print(f"   ✅ Activa: {'Sí' if company['is_active'] else 'No'}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error: {e}")


def test_global_stats(token):
    """Test estadísticas globales"""
    print("\n" + "="*70)
    print("3️⃣  ESTADÍSTICAS GLOBALES DEL SAAS")
    print("="*70)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/superadmin/stats/global",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Estadísticas obtenidas:")
            print(f"\n📊 EMPRESAS:")
            print(f"   Total: {stats['companies']['total']}")
            print(f"   Activas: {stats['companies']['active']}")
            print(f"   Suspendidas: {stats['companies']['suspended']}")
            print(f"   En Trial: {stats['companies']['trial']}")
            
            print(f"\n👥 USUARIOS:")
            print(f"   Total: {stats['users']['total']}")
            print(f"   Activos: {stats['users']['active']}")
            print(f"   Inactivos: {stats['users']['inactive']}")
            
            print(f"\n💰 INGRESOS:")
            print(f"   Total: {stats['revenue']['currency']} ${stats['revenue']['total']:,.2f}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error: {e}")


def test_create_company(token):
    """Test crear empresa"""
    print("\n" + "="*70)
    print("4️⃣  CREAR NUEVA EMPRESA (DEMO)")
    print("="*70)
    
    new_company = {
        "name": "Restaurante El Sabor",
        "email": "contacto@elsabor.com",
        "phone": "809-555-9999",
        "address": "Av. Principal 456",
        "max_users": 20,
        "max_tables": 40,
        "max_products": 250,
        "tax_rate": 18.00,
        "currency": "DOP"
    }
    
    print("📝 Datos de la empresa:")
    pprint(new_company)
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/superadmin/companies",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=new_company
        )
        
        if response.status_code == 201:
            data = response.json()
            print(f"\n✅ {data['message']}")
            print(f"🆔 ID: {data['company']['id']}")
            print(f"📅 Trial termina: {data['company']['trial_ends_at']}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    """Ejecutar todas las pruebas"""
    print("\n" + "🚀 "*35)
    print("PRUEBAS DEL SUPER ADMIN - APPetito SaaS")
    print("🚀 "*35)
    
    # Test 1: Login
    token = test_login()
    if not token:
        print("\n❌ No se pudo obtener token. Abortando pruebas.")
        return
    
    # Test 2: Listar empresas
    test_list_companies(token)
    
    # Test 3: Estadísticas globales
    test_global_stats(token)
    
    # Test 4: Crear empresa
    test_create_company(token)
    
    print("\n" + "="*70)
    print("✅ PRUEBAS COMPLETADAS")
    print("="*70)
    print("\n📝 Próximos pasos:")
    print("   • Prueba más endpoints en http://localhost:8000/docs")
    print("   • Suspende/reactiva empresas")
    print("   • Crea usuarios para empresas")
    print("   • Ve logs de auditoría\n")


if __name__ == "__main__":
    main()
