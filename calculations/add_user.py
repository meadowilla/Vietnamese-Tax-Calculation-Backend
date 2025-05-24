from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from testtax import compute_tax
# Setup
uri = "mongodb+srv://quyngoc2705:zuaFeu99jVbRgDW7@cluster0.cqhtd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri)
db = client["tax_engine"]

def add_user_and_compute_tax(user_data):
    # Insert new user document
    user_data["created_at"] = datetime.now(datetime.timezone.utc)
    result = db["user_profiles"].insert_one(user_data)
    
    # Fetch the inserted user
    new_user = db["user_profiles"].find_one({"_id": result.inserted_id})
    
    if new_user:
        salary_info = new_user["salary_info"]
        additional_income = new_user.get("additional_income", {})
        dependents = new_user.get("dependents", 0)

        gross_salary = salary_info.get("salary_amount") if not salary_info.get("is_net_salary") else None
        net_salary = salary_info.get("salary_amount") if salary_info.get("is_net_salary") else None

        computed_tax = compute_tax(
            gross_salary=gross_salary,
            net_salary=net_salary,
            contract_type=new_user.get("contract_type", "long_term"),
            residency_status=new_user.get("residency_status", "resident"),
            num_dependents=dependents,
            region=new_user.get("region", 1),
            extra_incomes=additional_income,
            company_bonus=new_user.get("company_bonus"),
            already_withheld=new_user.get("already_withheld", {})
        )

        print("✅ Tax Calculation Result:")
        print(computed_tax)
        return computed_tax
    else:
        print("❌ Failed to retrieve the new user!")
        return None

#Test function
new_user_data = {
    "user_id": ObjectId("67f09d22929f6ab99e66f19a"),  # Replace with real user id logic if needed
    "salary_info": {
        "salary_amount": 20_000_000,
        "is_net_salary": True
    },
    "contract_type": "long_term",
    "residency_status": "resident",
    "dependents": 1,
    "region": 1,
    "additional_income": {
        "freelance": 5_000_000,
        "rent": 100_000_000,
        "stocks": 10_000_000
    },
    "company_bonus": 5_000_000,
    "already_withheld": {
        "rent": True,
        "stocks": True
    }
}
if __name__ == "__main__":
    add_user_and_compute_tax(new_user_data)
