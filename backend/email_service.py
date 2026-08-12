import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Auto-load .env file if present in project root
env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_file):
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'\""))
    except Exception as e:
        print(f"[Email Service] Warning reading .env: {e}")

# Gmail SMTP Configuration
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "khuongnd.areteepm@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")  # Gmail App Password (16 characters)

def send_password_reset_email(target_email: str, target_username: str, temp_password: str) -> tuple[bool, str]:
    """
    Send password reset email via SMTP (Gmail).
    Returns (success: bool, message: str)
    """
    sender_email = SMTP_USERNAME
    sender_password = SMTP_PASSWORD
    
    if not sender_password:
        err_msg = "Chưa cấu hình Mật khẩu ứng dụng (App Password) cho Gmail SMTP. Vui lòng đặt biến môi trường SMTP_PASSWORD."
        print(f"[Email Service Warning] {err_msg} Email: {target_email}, Temp Password: {temp_password}")
        return False, err_msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🔑 [EPM Courses Hub] Mật khẩu khôi phục tài khoản của bạn"
        msg["From"] = f"EPM Courses Hub <{sender_email}>"
        msg["To"] = target_email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }}
                .container {{ max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
                .header {{ text-align: center; margin-bottom: 25px; border-bottom: 1px solid #334155; padding-bottom: 15px; }}
                .header h2 {{ color: #38bdf8; margin: 0; font-size: 22px; }}
                .content {{ font-size: 15px; line-height: 1.6; color: #cbd5e1; }}
                .pwd-box {{ background: #0f172a; border: 1px dashed #38bdf8; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; font-family: monospace; font-size: 26px; font-weight: bold; color: #fbbf24; letter-spacing: 3px; }}
                .footer {{ margin-top: 25px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 15px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>EPM Courses Hub</h2>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{target_username}</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với địa chỉ email này ({target_email}).</p>
                    <p>Mật khẩu tạm thời mới của bạn là:</p>
                    <div class="pwd-box">{temp_password}</div>
                    <p>Vui lòng dùng tên đăng nhập/email và mật khẩu tạm thời ở trên để đăng nhập. Hệ thống sẽ yêu cầu bạn <strong>đổi sang mật khẩu cá nhân mới</strong> ngay sau khi đăng nhập thành công.</p>
                    <p><em>Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ quản trị viên.</em></p>
                </div>
                <div class="footer">
                    <p>© 2026 EPM Courses Hub System. Email tự động, vui lòng không phản hồi.</p>
                </div>
            </div>
        </body>
        </html>
        """

        part_html = MIMEText(html_content, "html")
        msg.attach(part_html)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=12)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, target_email, msg.as_string())
        server.quit()

        return True, f"Email khôi phục mật khẩu đã được gửi thành công đến hòm thư {target_email}."
    except Exception as e:
        err_str = str(e)
        print(f"[SMTP Error] Failed to send email to {target_email}: {err_str}")
        return False, f"Không thể gửi mail qua Gmail SMTP ({err_str})"
