from pymongo import MongoClient
from bson import ObjectId

from datetime import datetime, timedelta

def date_to_paid_tax(data):
    """
    Calculate the tax payment deadline: 10 working days after the given date.
    If the date is incomplete or missing, use today's date.
    Input: dict with optional 'year', 'month', 'day'
    Output: deadline as 'YYYY-MM-DD'
    """
    try:
        year = data.get("year")
        month = data.get("month")
        day = data.get("day")
        if year and month and day:
            date_start = datetime(year, month, day)
        else:
            date_start = datetime.today()
    except:
        date_start = datetime.today()

    working_days = 0
    current_date = date_start

    while working_days < 10:
        current_date += timedelta(days=1)
        if current_date.weekday() < 5:  # 0 = Monday, ..., 4 = Friday
            working_days += 1

    return current_date.strftime("%Y-%m-%d")

    
def calculate_progressive_tax(taxable_income):
    brackets = [
        (0, 5, 0.05),
        (5, 10, 0.10),
        (10, 18, 0.15),
        (18, 32, 0.20),
        (32, 52, 0.25),
        (52, 80, 0.30),
        (80, float('inf'), 0.35),
    ]
    tax = 0
    for lower, upper, rate in brackets:
        if taxable_income > lower:
            taxed_amount = min(taxable_income, upper) - lower
            tax += taxed_amount * rate
    return round(tax,4)


def compute_tax(data):
    personal_deduction = 11
    dependent_deduction = 4.4 * data.get("dependents", 0)
    residency_status = data.get("residency_status", "resident")

    total_income = 0
    tax_paid_total = {"business": 0, "one_time": 0}
    tax_due_total = {"business": 0, "one_time": 0}

    result = {
        "business_income": {},
        "once_off_income": {}
    }

    # 1. income_labor_contract
    income_labor = data.get("income_labor_contract", 0)
    total_income += income_labor
    if data.get("taxed_labor_contract", False):
        paid = calculate_progressive_tax(income_labor)
        due = 0
        tax_paid_total["business"] += paid
    else:
        if residency_status == "resident":
            taxable = max(income_labor - personal_deduction - dependent_deduction, 0)
            due = calculate_progressive_tax(taxable)
        else:
            due = round(income_labor * 0.20,4)
        paid = 0
        tax_due_total["business"] += due
    result["business_income"]["income_labor_contract"] = {
        "amount": income_labor,
        "tax_paid": paid,
        "tax_due": due
    }

    # 2. income_no_contract
    income_short = data.get("income_no_contract", 0)
    total_income += income_short
    if data.get("taxed_no_contract", False):
        paid = round(income_short * 0.10,4)
        due = 0
        tax_paid_total["business"] += paid
    else:
        if income_short * 12 > 132:
            due = round(income_short * 0.10,4)
            paid = 0
            tax_due_total["business"] += due
        else:
            paid = due = 0
    result["business_income"]["income_no_contract"] = {
        "amount": income_short,
        "tax_paid": paid,
        "tax_due": due
    }

    # 3. income_foreign_contract
    income_foreign = data.get("income_foreign_contract", 0)
    total_income += income_foreign
    tax_foreign = round(income_foreign * 0.20,4)
    if data.get("deducted_tax_abroad", False):
        paid = tax_foreign
        due = 0
        tax_paid_total["business"] += paid
    else:
        paid = 0
        due = tax_foreign
        tax_due_total["business"] += due
    result["business_income"]["income_foreign_contract"] = {
        "amount": income_foreign,
        "tax_paid": paid,
        "tax_due": due
    }

    # 4. business_income (flat rate or net)
    if data.get("use_flat_rate", True):
        rates = {
            "distribution": 0.015,
            "service": 0.07,
            "rent": 0.10,
            "agent": 0.05,
            "production": 0.045,
            "others": 0.03
        }
        for key, val in data.get("business_income_flat", {}).items():
            total_income += val
            rate = rates.get(key, 0)
            due = round(val * rate,4)
            paid = 0
            tax_due_total["business"] += due
            result["business_income"][f"business_{key}"] = {
                "amount": val,
                "tax_paid": paid,
                "tax_due": due
            }
    else:
        net = data.get("business_income_net", {})
        gross = net.get("gross", 0)
        cost = net.get("cost", 0)
        profit = max(gross - cost - personal_deduction - dependent_deduction, 0)
        total_income += gross
        due = calculate_progressive_tax(profit)
        paid = 0
        tax_due_total["business"] += due
        result["business_income"]["business_net"] = {
            "amount": gross,
            "tax_paid": paid,
            "tax_due": due
        }

    # 5. once_off_income
    once_off_income = data.get("once_off_income", {})
    taxed_once = data.get("taxed_once_off", {})
    once_rates = {
        "real_estate": 0.02,
        "investment": 0.05,
        "capital_transfer": 0.20,
        "royalty": 0.05,
        "lottery": 0.10,
        "inheritance": 0.10
    }

    for key, val in once_off_income.items():
        total_income += val
        tax = round(val * once_rates.get(key, 0),4)
        if taxed_once.get(key, False):
            paid = tax
            due = 0
            tax_paid_total["one_time"] += paid
        else:
            paid = 0
            due = tax
            tax_due_total["one_time"] += due
        result["once_off_income"][key] = {
            "amount": val,
            "tax_paid": paid,
            "tax_due": due
        }

    result["total_income"] = round(total_income,4)
    result["summary"] = {
        "tax_paid": {k: round(v,4) for k, v in tax_paid_total.items()},
        "tax_need_to_pay": {k: round(v,4) for k, v in tax_due_total.items()}
    }
    #Deadline to pay
    result["deadline_to_pay_tax"] = date_to_paid_tax(data)

    return result
