/* TESR Ledger — ไฟล์ตั้งค่า (แก้ไฟล์นี้ไฟล์เดียวบน GitHub) */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwcqMNV4ednKjwdLTB7p7dkVf-xBEfotb-H_Qbo25mMohpufd9EwxF_IRRTfP354RtCgw/exec',            // ใส่ URL /exec ของ Apps Script ที่นี่ ทีมจะไม่ต้องตั้งค่าเอง
  APP_TOKEN: '',          // ถ้าตั้ง APP_TOKEN ใน Script Properties ให้ใส่ค่าเดียวกัน
  LOGIN_REQUIRED: true,   // ต้องเข้าสู่ระบบด้วย Google ก่อนใช้งาน
  GOOGLE_CLIENT_ID: '662990826523-kajaodamq4jcc9epsls3gq4he66tog6o.apps.googleusercontent.com',   // OAuth Client ID (Web) จาก Google Cloud Console — ดู README ข้อ 2.3
  ALLOWED_EMAILS: ['ceo.anoney.potter@gmail.com', 'anoney.potter@gmail.com', 'tesrshop@gmail.com'],   // ตรวจซ้ำที่หลังบ้าน (ชีตตั้งค่า ALLOWED_EMAILS)
  AUTO_AI: true,          // อ่านสลิปด้วย AI ทันทีที่แนบ
  MAX_IMAGE_PX: 1600, JPEG_QUALITY: 0.85, MAX_PDF_MB: 8, MAX_FILES: 6,
  PAGE_W: 1240, PAGE_H: 1754,   // A4 ที่ 150 dpi
};
