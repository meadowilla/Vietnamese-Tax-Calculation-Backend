const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');

exports.contactController = async(req, res) => {
    try{
        const {username, phoneNumber, email, date, content} = req.body;

        // validate the input
        if (!username || !phoneNumber || !email || !date) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" , status: "error"});
        }
        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ message: "Số điện thoại không hợp lệ", status: "error" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Email không hợp lệ", status: "error" });
        }
        if (new Date(date) < new Date()) {
            return res.status(400).json({ message: "Ngày hẹn không được là quá khứ", status: "error" });
        }
        
        // create a transporter for nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        // setup email data
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 
                `Yêu cầu tư vấn từ ${username}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 10px; border: 1px solid #ddd; border-radius: 6px; max-width: 500px;">
                <h2 style="color: #2c3e50;">📌 Thông tin yêu cầu tư vấn</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                    <td style="padding: 6px 0;"><strong>Họ và tên:</strong></td>
                    <td>${username}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Số điện thoại:</strong></td>
                    <td>${phoneNumber}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Email:</strong></td>
                    <td><a href="mailto:${email}">${email}</a></td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Ngày hẹn:</strong></td>
                    <td>${date}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Nội dung tư vấn:</strong></td>
                    <td style="white-space: pre-wrap;">${content}</td>
                    </tr>
                </table>
                </div>
            `
        };
        // send mail
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Gửi yêu cầu tư vấn thành công!", success: true, });

    }catch(error){
        console.error("Error in contactController:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
}


exports.chatController = async (req, res) => {
  try {
    const userMessage = req.body.message.toLowerCase();

    // Danh sách câu hỏi và trả lời mặc định về thuế thu nhập cá nhân
    const taxResponses = [
      {
        keywords: ["thuế thu nhập cá nhân", "tính thuế thu nhập cá nhân", "thuế tncn", "tính thuế"],
        response: "Thuế thu nhập cá nhân tại Việt Nam được tính theo biểu thuế lũy tiến từng phần, với các bậc từ 5% đến 35% tùy thuộc vào thu nhập chịu thuế. Thu nhập chịu thuế = Thu nhập tính thuế - Các khoản giảm trừ (giảm trừ gia cảnh, bảo hiểm bắt buộc, v.v.). Ví dụ: Giảm trừ gia cảnh hiện tại (2025) là 11 triệu VNĐ/tháng cho bản thân và 4.4 triệu VNĐ/tháng cho mỗi người phụ thuộc."
      },
      {
        keywords: ["giảm trừ gia cảnh", "mức giảm trừ"],
        response: "Mức giảm trừ gia cảnh hiện tại (2025) là 11 triệu VNĐ/tháng cho người nộp thuế và 4.4 triệu VNĐ/tháng cho mỗi người phụ thuộc. Các khoản giảm trừ khác bao gồm bảo hiểm xã hội, bảo hiểm y tế, và các khoản đóng góp từ thiện được pháp luật cho phép."
      },
      {
        keywords: ["làm tự do", "thuế freelance", "thuế freelancer"],
        response: "Người làm tự do (freelancer) tại Việt Nam có thể nộp thuế thu nhập cá nhân theo phương pháp khấu trừ 10% trên doanh thu (nếu không đăng ký phương pháp kê khai) hoặc theo phương pháp kê khai nếu có sổ sách kế toán. Nếu doanh thu dưới 100 triệu VNĐ/năm, bạn có thể được miễn thuế."
      },
      {
        keywords: ["mã số thuế", "tra cứu mã số thuế"],
        response: "Để tra cứu mã số thuế cá nhân, bạn có thể truy cập website của Tổng cục Thuế (www.gdt.gov.vn) hoặc sử dụng ứng dụng eTax Mobile. Bạn cần cung cấp thông tin CMND/CCCD để kiểm tra."
      },
      {
        keywords: ["hoàn thuế", "hoàn thuế thu nhập cá nhân"],
        response: "Hoàn thuế thu nhập cá nhân áp dụng khi bạn nộp thừa thuế hoặc thuộc diện được miễn giảm. Bạn cần nộp hồ sơ hoàn thuế tại cơ quan thuế, bao gồm tờ khai quyết toán thuế và các chứng từ liên quan. Thời hạn quyết toán thường là 31/3 hàng năm."
      },
      {
        keywords: ["freelance quốc tế", "dịch vụ youtube", "quảng cáo"],
        response: "Thu nhập từ freelance quốc tế, YouTube, quảng cáo chịu thuế suất 7% trên doanh thu."
      },
      {
        keywords: ["bán hàng online", "kinh doanh hàng hóa"],
        response: "Thu nhập từ bán hàng online chịu thuế suất 1.5% trên doanh thu."
      },
      {
        keywords: ["dịch vụ ăn uống", "spa", "vận tải"],
        response: "Thu nhập từ dịch vụ ăn uống, spa, vận tải chịu thuế suất 4.5% trên doanh thu."
      },
      {
        keywords: ["chứng khoán"],
        response: "Thu nhập từ bán chứng khoán chịu thuế suất 0.1% trên giá trị giao dịch, thường được khấu trừ tại nguồn."
      },
      {
        keywords: ["cổ tức", "tiền gửi ngân hàng", "trái phiếu"],
        response: "Cổ tức tiền mặt và trái phiếu chịu thuế suất 5%, tiền gửi ngân hàng 0%. Thuế thường được khấu trừ tại nguồn."
      },
      {
        keywords: ["bán bất động sản"],
        response: "Thu nhập từ bán bất động sản chịu thuế suất 2% trên giá trị chuyển nhượng, không phụ thuộc vào lãi/lỗ."
      },
      {
        keywords: ["cho thuê tài sản", "cho thuê nhà"],
        response: "Thu nhập từ cho thuê tài sản chịu thuế 10% nếu tổng thu nhập trên 100 triệu VNĐ/năm. Vui lòng tự kê khai để quyết toán thuế."
      },
      {
        keywords: ["trúng thưởng", "trúng số"],
        response: "Thu nhập từ trúng thưởng (trừ thưởng Tết) chịu thuế 10% nếu trên 10 triệu VNĐ/lần, khấu trừ tại nguồn."
      },
      {
        keywords: ["quà tặng", "thừa kế"],
        response: "Quà tặng hoặc thừa kế chịu thuế 10% nếu giá trị trên 10 triệu VNĐ/lần, trừ một số trường hợp miễn thuế theo luật."
      }
    ];

    // Danh sách từ khóa liên quan đến thuế để kiểm tra câu hỏi
    const taxKeywords = [
      "thuế", "tncn", "thu nhập", "giảm trừ", "hoàn thuế", 
      "mã số thuế", "freelance", "làm tự do", "kê khai", 
      "bán hàng online", "kinh doanh", "dịch vụ", "chứng khoán", 
      "cổ tức", "tiền gửi", "trái phiếu", "bất động sản", 
      "cho thuê", "trúng thưởng", "trúng số", "quà tặng", "thừa kế"
    ];

    // Kiểm tra xem câu hỏi có liên quan đến thuế không
    const isTaxRelated = taxKeywords.some(keyword => userMessage.includes(keyword));

    if (!isTaxRelated) {
      return res.json({
        success: true,
        reply: "Câu hỏi của bạn không liên quan đến thuế. Vui lòng liên hệ chuyên gia tư vấn thuế của chúng tôi qua email: vietnamesetaxcalculation@gmail.com"
      });
    }

    // Tìm câu trả lời phù hợp trong danh sách mặc định
    let reply = "Câu hỏi của bạn chưa được hỗ trợ trong hệ thống. Vui lòng liên hệ chuyên gia tư vấn thuế của chúng tôi qua email: vietnamesetaxcalculation@gmail.com";
    
    for (const taxResponse of taxResponses) {
      if (taxResponse.keywords.some(keyword => userMessage.includes(keyword))) {
        reply = taxResponse.response;
        break;
      }
    }

    res.json({ success: true, reply });
  } catch (error) {
    console.error("Error in chatController:", error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
};