import requests
import sys
import json
from datetime import datetime

class BioLensAPITester:
    def __init__(self, base_url="https://material-check.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, expected_fields=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                pass

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Check expected fields if provided
                if expected_fields and response_data:
                    for field in expected_fields:
                        if field in response_data:
                            print(f"   ✓ Field '{field}' present")
                        else:
                            print(f"   ⚠️  Field '{field}' missing")
                            success = False
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response_data:
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")

            self.results.append({
                "test": name,
                "success": success,
                "status_code": response.status_code,
                "response": response_data
            })

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.results.append({
                "test": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200,
            expected_fields=["message"]
        )

    def test_search_polyester_hoodie(self):
        """Test search for polyester hoodie - should return Petro-Based, High risk"""
        success, response = self.run_test(
            "Search Polyester Hoodie",
            "POST",
            "search",
            200,
            data={"query": "polyester hoodie"},
            expected_fields=["query", "found", "material_name", "category_label", "risk_level", "explanation", "alternatives"]
        )
        
        if success and response.get("found"):
            if response.get("category_label") == "Petro-Based" and response.get("risk_level") == "High":
                print("   ✓ Correctly classified as Petro-Based with High risk")
            else:
                print(f"   ⚠️  Classification issue: {response.get('category_label')}, {response.get('risk_level')}")
        
        return success, response

    def test_search_bamboo_rayon_dress(self):
        """Test search for bamboo rayon dress - should return Transition Material, Medium risk"""
        success, response = self.run_test(
            "Search Bamboo Rayon Dress",
            "POST",
            "search",
            200,
            data={"query": "bamboo rayon dress"},
            expected_fields=["query", "found", "material_name", "category_label", "risk_level"]
        )
        
        if success and response.get("found"):
            if response.get("category_label") == "Transition Material" and response.get("risk_level") == "Medium":
                print("   ✓ Correctly classified as Transition Material with Medium risk")
            else:
                print(f"   ⚠️  Classification issue: {response.get('category_label')}, {response.get('risk_level')}")
        
        return success, response

    def test_search_hemp_shirt(self):
        """Test search for hemp shirt - should return Plant-Based, Low risk, no alternatives"""
        success, response = self.run_test(
            "Search Hemp Shirt",
            "POST",
            "search",
            200,
            data={"query": "hemp shirt"},
            expected_fields=["query", "found", "material_name", "category_label", "risk_level", "alternatives"]
        )
        
        if success and response.get("found"):
            if (response.get("category_label") == "Plant-Based" and 
                response.get("risk_level") == "Low" and 
                len(response.get("alternatives", [])) == 0):
                print("   ✓ Correctly classified as Plant-Based with Low risk and no alternatives")
            else:
                print(f"   ⚠️  Classification issue or unexpected alternatives")
        
        return success, response

    def test_search_unknown_product(self):
        """Test search for unknown product - should return not found"""
        success, response = self.run_test(
            "Search Unknown Product",
            "POST",
            "search",
            200,
            data={"query": "magical unicorn product"},
            expected_fields=["query", "found"]
        )
        
        if success and response.get("found") == False:
            print("   ✓ Correctly returns not found for unknown product")
        elif success:
            print("   ⚠️  Should not have found unknown product")
        
        return success, response

    def test_get_all_materials(self):
        """Test GET /materials endpoint - should return 26 materials"""
        success, response = self.run_test(
            "Get All Materials",
            "GET",
            "materials",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✓ Returned {len(response)} materials")
            if len(response) == 26:
                print("   ✓ Expected 26 materials found")
            else:
                print(f"   ⚠️  Expected 26 materials, got {len(response)}")
                
            # Check structure of first material
            if response and len(response) > 0:
                mat = response[0]
                required_fields = ["name", "slug", "category", "category_label", "risk_level", "description"]
                for field in required_fields:
                    if field in mat:
                        print(f"   ✓ Material has '{field}' field")
                    else:
                        print(f"   ⚠️  Material missing '{field}' field")
        
        return success, response

    def test_get_popular_searches(self):
        """Test GET /search/popular endpoint"""
        success, response = self.run_test(
            "Get Popular Searches",
            "GET",
            "search/popular",
            200,
            expected_fields=["examples"]
        )
        
        if success and "examples" in response:
            examples = response.get("examples", [])
            print(f"   ✓ Returned {len(examples)} example searches")
            
            # Check for expected examples
            expected_examples = ["polyester hoodie", "hemp shirt", "glass bottle"]
            for example in expected_examples:
                if example in examples:
                    print(f"   ✓ Found expected example: {example}")
                else:
                    print(f"   ⚠️  Missing expected example: {example}")
        
        return success, response

    def test_search_edge_cases(self):
        """Test various edge cases"""
        edge_cases = [
            {"query": "", "name": "Empty Query"},
            {"query": "   ", "name": "Whitespace Query"},
            {"query": "POLYESTER HOODIE", "name": "Uppercase Query"},
            {"query": "polyester", "name": "Single Material Word"},
        ]
        
        all_passed = True
        for case in edge_cases:
            success, response = self.run_test(
                f"Edge Case: {case['name']}",
                "POST",
                "search",
                200,
                data={"query": case["query"]}
            )
            if not success:
                all_passed = False
                
        return all_passed, {}

    def test_barcode_lookup(self):
        """Test barcode lookup endpoint - should return product info or empty result"""
        # Test with a common UPC barcode (Coca-Cola)
        success, response = self.run_test(
            "Barcode Lookup - Valid UPC",
            "POST",
            "barcode/lookup",
            200,
            data={"barcode": "049000042566"},
            expected_fields=["barcode"]
        )
        
        if success:
            barcode = response.get("barcode")
            title = response.get("title")
            if barcode == "049000042566":
                print("   ✓ Barcode correctly returned in response")
            if title:
                print(f"   ✓ Product found: {title}")
            else:
                print("   ℹ️  No product title found (acceptable for test barcode)")
        
        return success, response

    def test_barcode_lookup_invalid(self):
        """Test barcode lookup with invalid barcode"""
        success, response = self.run_test(
            "Barcode Lookup - Invalid UPC",
            "POST",
            "barcode/lookup",
            200,
            data={"barcode": "123456789"},
            expected_fields=["barcode"]
        )
        
        if success:
            barcode = response.get("barcode")
            title = response.get("title")
            if barcode == "123456789":
                print("   ✓ Barcode correctly returned in response")
            if not title:
                print("   ✓ No product found for invalid barcode (expected)")
            else:
                print(f"   ⚠️  Unexpected product found for invalid barcode: {title}")
        
        return success, response

def main():
    print("🧪 BioLens API Testing Suite")
    print("=" * 50)
    
    tester = BioLensAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_root_endpoint,
        tester.test_search_polyester_hoodie,
        tester.test_search_bamboo_rayon_dress,
        tester.test_search_hemp_shirt,
        tester.test_search_unknown_product,
        tester.test_get_all_materials,
        tester.test_get_popular_searches,
        tester.test_search_edge_cases,
        tester.test_barcode_lookup,
        tester.test_barcode_lookup_invalid,
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests Summary:")
    print(f"   Total: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    # Return success if all critical tests pass
    critical_failures = [r for r in tester.results if not r.get("success", False)]
    if critical_failures:
        print(f"\n❌ Critical failures detected:")
        for failure in critical_failures:
            print(f"   - {failure.get('test', 'Unknown')}")
    
    return 0 if len(critical_failures) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())