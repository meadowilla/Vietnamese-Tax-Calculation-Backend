from pymongo import MongoClient
from bson import ObjectId

def calculate_progressive_tax(taxable_income):
    brackets = [
        (0, 5_000_000, 0.05),
        (5_000_000, 10_000_000, 0.10),
        (10_000_000, 18_000_000, 0.15),
        (18_000_000, 32_000_000, 0.20),
        (32_000_000, 52_000_000, 0.25),
        (52_000_000, 80_000_000, 0.30),
        (80_000_000, float('inf'), 0.35),
    ]
    tax = 0
    for lower, upper, rate in brackets:
        if taxable_income > lower:
            taxed_amount = min(taxable_income, upper) - lower
            tax += taxed_amount * rate
    return round(tax)

def calculate_gross_from_net(net_salary, num_dependents):
    personal_deduction = 11_000_000
    dependent_deduction = 4_400_000 * num_dependents
    social_insurance_rate = 0.105
    gross_salary = net_salary / (1 - social_insurance_rate)

    for _ in range(10):
        taxable_income = gross_salary * (1 - social_insurance_rate) - personal_deduction - dependent_deduction
        tax = calculate_progressive_tax(taxable_income) if taxable_income > 0 else 0
        estimated_net = gross_salary * (1 - social_insurance_rate) - tax
        gross_salary += (net_salary - estimated_net)
    return round(gross_salary)

def compute_tax(
    gross_salary=None,
    net_salary=None,
    contract_type='long_term',
    residency_status='resident',
    num_dependents=0,
    months_worked=12,
    region=1,
    extra_incomes=None,
    company_bonus=0,
    already_withheld=None,
    social_insurance_paid=0, # phòng cho trường hợp tự đóng
    charity_donations=0,
    total_income=0 # trong trường hợp người không có hợp đồng lao động cần kê khai thu nhập cả năm
):
    extra_incomes = extra_incomes or {}
    already_withheld = already_withheld or {}

    if net_salary and not gross_salary and contract_type == 'long_term':
        gross_salary = calculate_gross_from_net(net_salary, num_dependents)

    gross_salary = gross_salary or 0
    social_insurance = 0
    personal_deduction = 11_000_000
    dependent_deduction = 4_400_000 * num_dependents

    if contract_type == 'long_term' and residency_status == 'resident':
        social_insurance = gross_salary * 0.105

    taxable_income = gross_salary - social_insurance


    if contract_type == 'short_term' and residency_status == 'resident':
        total_annual_income = total_income

        # Trường hợp thu nhập không có hợp đồng, áp thuế 10% nếu tổng thu nhập > 132 triệu
        if contract_type == 'short_term':
            if total_annual_income > 132_000_000:
                tax = total_income * 0.10
            else:
                tax = 0  # Thu nhập thấp hơn thì không bị tính thuế

    elif residency_status == 'non_resident':
        # Không cư trú: không được giảm trừ gia cảnh
        taxable_income = (gross_salary - social_insurance) * months_worked
        taxable_income += company_bonus
        taxable_income -= charity_donations
        taxable_income = max(taxable_income, 0)
        income_tax = round(taxable_income * 0.20) if taxable_income > 0 else 0

    else:
        # Dự phòng cho short_term
        taxable_income = gross_salary - social_insurance
        income_tax = round(taxable_income * 0.10) if taxable_income > 0 else 0

    flat_tax_rates = {
        'freelance': 0.07,
        'online_sales': 0.015,
        'food_transport_spa': 0.045,
        'investment': 0.05,
        'stocks': 0.001,
        'prizes': 0.10,
        'inheritance': 0.10,
        'rent': 0.10,
        'real_estate_sale': 0.02,
        'short_term_contract': 0.10,
    }

    flat_tax_total = 0
    flat_tax_breakdown = {}
    withheld_tax_total = 0
    withheld_tax_breakdown = {}

    for income_type, value in extra_incomes.items():
        rate = flat_tax_rates.get(income_type, 0)
        tax_amount = value * rate
        if already_withheld.get(income_type, False):
            withheld_tax_breakdown[income_type] = round(tax_amount)
            withheld_tax_total += tax_amount
        else:
            flat_tax_breakdown[income_type] = round(tax_amount)
            flat_tax_total += tax_amount

    total_tax = income_tax + flat_tax_total
    refund_or_pay = total_tax - withheld_tax_total

    return {
        "gross_salary": round(gross_salary),
        "social_insurance": round(social_insurance),
        "taxable_income": round(taxable_income),
        "income_tax_luy_tien_or_10_20": round(income_tax),
        "flat_tax_other_sources": flat_tax_breakdown,
        "flat_tax_total": round(flat_tax_total),
        "withheld_tax_sources": withheld_tax_breakdown,
        "withheld_tax_total": round(withheld_tax_total),
        "total_tax_after_offset": round(total_tax),
        "tax_final_payment_or_refund": round(refund_or_pay)
    }

def fetch_user_tax_data(user_id):
    uri = "mongodb+srv://quyngoc2705:zuaFeu99jVbRgDW7@cluster0.cqhtd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client = MongoClient(uri)
    db = client["tax_engine"]

    user_profile = db["user_profiles"].find_one(
        {"user_id": ObjectId(user_id)},
        sort=[("created_at", -1)]
    )

    if not user_profile:
        return None

    salary_info = user_profile.get("salary_info", {})
    gross_salary = salary_info.get("salary_amount") if not salary_info.get("is_net_salary") else None
    net_salary = salary_info.get("salary_amount") if salary_info.get("is_net_salary") else None

    return compute_tax(
        gross_salary=gross_salary,
        net_salary=net_salary,
        contract_type=user_profile.get("contract_type", "long_term"),
        residency_status=user_profile.get("residency_status", "resident"),
        num_dependents=user_profile.get("dependents", 0),
        months_worked=user_profile.get("months_worked", 12),
        region=user_profile.get("region", 1),
        extra_incomes=user_profile.get("additional_income", {}),
        company_bonus=user_profile.get("company_bonus", 0),
        already_withheld=user_profile.get("already_withheld", {}),
        social_insurance_paid=user_profile.get("social_insurance_paid", 0),
        charity_donations=user_profile.get("charity_donations", 0),
    )

if __name__ == "__main__":
    sample_user_id = "67f09d22929f6ab99e66f19a"
    result = fetch_user_tax_data(sample_user_id)

    if result:
        print("✅ Tax Calculation Result:")
        print(result)
    else:
        print("❌ User data not found.")
