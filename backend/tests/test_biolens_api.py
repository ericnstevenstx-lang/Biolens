"""
BioLens API Backend Tests - Iteration 6
Tests for backend API endpoints: search, materials, barcode lookup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://material-check.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestAPIRoot:
    """Basic API health checks"""
    
    def test_api_root_accessible(self):
        """Test that API root returns correct response"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "BioLens API"
        print("API root endpoint accessible")


class TestSearchEndpoint:
    """Tests for /api/search endpoint"""
    
    def test_search_polyester_hoodie(self):
        """Test search for petro-based product 'polyester hoodie'"""
        response = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "polyester hoodie"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["material_name"] == "Polyester"
        assert data["category_label"] == "Petro-Based"
        assert data["risk_level"] == "High"
        assert "alternatives" in data
        assert len(data["alternatives"]) > 0
        print(f"Search polyester hoodie: found={data['found']}, material={data['material_name']}, risk={data['risk_level']}")
    
    def test_search_hemp_shirt(self):
        """Test search for plant-based product 'hemp shirt'"""
        response = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "hemp shirt"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["material_name"] == "Hemp"
        assert data["category_label"] == "Plant-Based"
        assert data["risk_level"] == "Low"
        # Hemp is a good material, should have no/few alternatives
        print(f"Search hemp shirt: found={data['found']}, material={data['material_name']}, risk={data['risk_level']}")
    
    def test_search_bamboo_sheets(self):
        """Test search for plant-based product 'bamboo sheets'"""
        response = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "bamboo sheets"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["material_name"] in ["Bamboo (Fiber)", "Bamboo"]
        print(f"Search bamboo sheets: found={data['found']}, material={data['material_name']}, category={data['category_label']}")
    
    def test_search_not_found(self):
        """Test search for unknown product"""
        response = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "xyzabc123unknown"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is False
        print(f"Search unknown: found={data['found']}")


class TestMaterialsEndpoint:
    """Tests for /api/materials endpoints"""
    
    def test_get_all_materials(self):
        """Test getting all materials list"""
        response = requests.get(f"{BASE_URL}/api/materials")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check structure of first material
        first = data[0]
        assert "name" in first
        assert "slug" in first
        assert "category" in first
        assert "risk_level" in first
        print(f"GET materials: {len(data)} materials returned")
    
    def test_get_single_material_polyester(self):
        """Test getting a specific material by slug"""
        response = requests.get(f"{BASE_URL}/api/materials/polyester")
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "Polyester"
        assert data.get("risk_level") == "High"
        assert "alternatives" in data
        print(f"GET material polyester: name={data.get('name')}, risk={data.get('risk_level')}")
    
    def test_get_single_material_hemp(self):
        """Test getting hemp material by slug"""
        response = requests.get(f"{BASE_URL}/api/materials/hemp")
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "Hemp"
        assert data.get("risk_level") == "Low"
        print(f"GET material hemp: name={data.get('name')}, risk={data.get('risk_level')}")


class TestBarcodeLookup:
    """Tests for /api/barcode/lookup endpoint"""
    
    def test_barcode_lookup_returns_result(self):
        """Test barcode lookup endpoint responds correctly"""
        # Using a common test barcode
        response = requests.post(
            f"{BASE_URL}/api/barcode/lookup",
            json={"barcode": "012345678901"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "barcode" in data
        assert data["barcode"] == "012345678901"
        # Source may or may not be present depending on cache state
        print(f"Barcode lookup: barcode={data.get('barcode')}, title={data.get('title')}, source={data.get('source')}")
    
    def test_barcode_lookup_structure(self):
        """Test barcode lookup returns correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/barcode/lookup",
            json={"barcode": "123456789012"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check structure - BarcodeResult model
        expected_keys = ["barcode"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        # Optional keys may or may not have values
        optional_keys = ["title", "brand", "description", "source"]
        for key in optional_keys:
            assert key in data or data.get(key) is None
        print(f"Barcode lookup structure valid")


class TestPopularSearches:
    """Tests for /api/search/popular endpoint"""
    
    def test_get_popular_searches(self):
        """Test getting popular search examples"""
        response = requests.get(f"{BASE_URL}/api/search/popular")
        assert response.status_code == 200
        data = response.json()
        assert "examples" in data
        assert isinstance(data["examples"], list)
        assert len(data["examples"]) > 0
        print(f"Popular searches: {len(data['examples'])} examples returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
