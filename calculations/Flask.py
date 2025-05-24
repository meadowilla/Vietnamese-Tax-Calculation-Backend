from flask import Flask, request, jsonify
from flask_cors import CORS
from tax_calculation import compute_tax
import sys

app = Flask(__name__)
CORS(app)  # Cho phép frontend gửi request

@app.route("/api/calculate-tax", methods=["POST"])
def calculate_tax():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        result = compute_tax(data)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()

