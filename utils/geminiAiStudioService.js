// OCR-APP-BACKEND/utils/geminiAiStudioService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.error("KRITIKAL: GEMINI_API_KEY tidak valid atau belum diatur di file .env. Aplikasi mungkin tidak akan berfungsi dengan benar.");
    // Untuk aplikasi produksi, sebaiknya throw error di sini agar aplikasi tidak berjalan tanpa API key yang valid.
    // throw new Error("KRITIKAL: GEMINI_API_KEY tidak valid atau belum diatur.");
}

// Definisikan generationConfig dan safetySettings di sini agar mudah diakses dan konsisten
const generationConfig = {
    temperature: 0.1, // Rendah untuk output yang lebih konsisten dan faktual
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096, // Pastikan cukup untuk JSON output yang kompleks
    responseMimeType: "application/json", // SANGAT PENTING untuk meminta output JSON langsung
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // Atau "gemini-pro" jika diperlukan
    generationConfig, // Set konfigurasi generasi saat inisialisasi model
    safetySettings    // Set konfigurasi keamanan saat inisialisasi model
});


// Fungsi untuk membuat prompt
// PASTIKAN ANDA MENYALIN SELURUH SKEMA JSON ANDA DI SINI
const promptTemplate = (ocrText) => `
    Anda adalah sistem AI yang sangat canggih dan presisi untuk ekstraksi data dari teks invoice hasil OCR.
    Tugas Anda adalah membaca teks berikut, mengidentifikasi informasi kunci, dan mengembalikannya dalam format JSON yang ketat.

    Teks Invoice (hasil OCR):
    \`\`\`text
    ${ocrText}
    \`\`\`

    Format JSON yang WAJIB diikuti (gunakan nilai null jika data tidak ditemukan, angka harus tipe number, tanggal harus YYYY-MM-DD):
    {
      "nomor_invoice": "string | null",
      "tanggal_invoice": "string (YYYY-MM-DD) | null",
      "tanggal_jatuh_tempo": "string (YYYY-MM-DD) | null",
      "nama_vendor": "string | null",
      "alamat_vendor": "string | null",
      "telepon_vendor": "string | null",
      "email_vendor": "string | null",
      "website_vendor": "string | null",
      "npwp_vendor": "string | null",
      "nama_pelanggan": "string | null",
      "alamat_pelanggan": "string | null",
      "telepon_pelanggan": "string | null",
      "email_pelanggan": "string | null",
      "item_baris": [
        {
          "kode_item": "string | null",
          "deskripsi": "string",
          "kuantitas": "number",
          "satuan": "string | null", // e.g., pcs, kg, unit
          "harga_satuan": "number",
          "diskon_item_persen": "number | null", // Diskon per item jika ada
          "diskon_item_jumlah": "number | null",
          "pajak_item_persen": "number | null", // Pajak per item jika ada
          "pajak_item_jumlah": "number | null",
          "total_harga_item": "number" // (kuantitas * harga_satuan) - diskon_item_jumlah + pajak_item_jumlah
        }
      ],
      "subtotal_sebelum_diskon_pajak_global": "number | null", // Total semua total_harga_item sebelum diskon dan pajak global invoice
      "diskon_global_persen": "number | null", // Diskon untuk keseluruhan invoice
      "diskon_global_jumlah": "number | null",
      "subtotal_setelah_diskon_global": "number | null",
      "pajak_ppn_persen": "number | null",
      "pajak_ppn_jumlah": "number | null",
      "pajak_pph_persen": "number | null", // Untuk PPh jika teridentifikasi
      "pajak_pph_jumlah": "number | null",
      "biaya_pengiriman": "number | null",
      "biaya_lain": "number | null",
      "total_keseluruhan": "number | null", // Nilai akhir yang harus dibayar
      "mata_uang": "string (IDR, USD, dll.) | null", // Harus konsisten
      "metode_pembayaran": "string | null",
      "rekening_bank_vendor": "string | null",
      "catatan": "string | null"
    }

    INSTRUKSI PENTING:
    1. Akurasi dan kepatuhan pada skema JSON adalah prioritas utama. Jika tidak yakin tentang suatu field, gunakan null.
    2. Ekstrak SEMUA item baris yang ada. Jika tidak ada item baris, kembalikan array kosong [].
    3. Pastikan semua nilai numerik adalah tipe 'number', bukan string. Bersihkan simbol mata uang, koma sebagai pemisah ribuan, dan gunakan titik sebagai pemisah desimal sebelum konversi ke number.
    4. Format tanggal HARUS YYYY-MM-DD. Konversi dari format lain. Jika tahun tidak ada, asumsikan tahun berjalan (${new Date().getFullYear()}) jika konteks mendukung, atau null.
    5. Jika ada beberapa jenis pajak (PPN, PPh), coba pisahkan. Jika hanya ada satu nilai pajak tanpa keterangan, asumsikan PPN.
    6. Output HANYA berupa JSON yang valid dan lengkap sesuai skema di atas. JANGAN tambahkan teks penjelasan, komentar, atau markdown seperti \`\`\`json.
    `;


async function extractDetailsWithGemini(ocrText) {
    // Pengecekan API Key lagi sebelum setiap panggilan (meskipun sudah dicek di atas, ini untuk keamanan fungsi)
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
         throw new Error("Gemini API Key tidak valid atau belum dikonfigurasi. Tidak dapat melanjutkan.");
    }
    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim() === "") {
        throw new Error("Teks OCR yang diberikan kosong atau tidak valid. Tidak dapat diproses oleh Gemini.");
    }

    const fullPrompt = promptTemplate(ocrText);

    console.log("INFO: Mengirim permintaan ke Gemini API...");
    // Untuk debug prompt, uncomment baris berikut:
    // console.debug("DEBUG: Prompt yang dikirim ke Gemini (awal 500 karakter):\n", fullPrompt.substring(0, 500) + "...");

    try {
        // Dengan generationConfig dan safetySettings di-set saat inisialisasi model,
        // kita hanya perlu mengirimkan konten.
        const result = await model.generateContent(
            // Bentuk paling sederhana adalah string prompt langsung jika tidak ada history chat
            // atau array [{ role: 'user', parts: [{ text: fullPrompt }] }]
            // Pustaka @google/generative-ai versi baru lebih suka objek
            {
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
            }
        );

        const response = result.response;

        // Pengecekan respons yang lebih ketat
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0 || !response.candidates[0].content.parts[0].text) {
            const feedback = response && response.promptFeedback ? `Prompt Feedback: ${JSON.stringify(response.promptFeedback)}` : "Tidak ada feedback tambahan.";
            // finishReason bisa jadi penting: "STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"
            const candidateInfo = response && response.candidates && response.candidates.length > 0 ? `Finish Reason: ${response.candidates[0].finishReason}` : "Tidak ada kandidat."
            const errorDetail = `Struktur respons Gemini tidak valid atau kosong. ${candidateInfo}. ${feedback}`;
            console.error(errorDetail, JSON.stringify(response, null, 2)); // Log seluruh respons untuk investigasi
            throw new Error(errorDetail);
        }
        
        let jsonTextOutput = response.candidates[0].content.parts[0].text;
        console.log("INFO: Respons teks mentah dari Gemini API diterima.");
        // Untuk debug output mentah sebelum dibersihkan, uncomment baris berikut:
        // console.debug("DEBUG: Raw text from Gemini (sebelum dibersihkan):\n", jsonTextOutput);

        // --- BLOK PEMBERSIHAN MARKDOWN ---
        jsonTextOutput = jsonTextOutput.trim();
        if (jsonTextOutput.startsWith("```json")) {
            jsonTextOutput = jsonTextOutput.substring(7); // Hapus ```json (7 karakter)
            if (jsonTextOutput.endsWith("```")) {
                jsonTextOutput = jsonTextOutput.substring(0, jsonTextOutput.length - 3); // Hapus ``` (3 karakter)
            }
        } else if (jsonTextOutput.startsWith("```")) { // Kasus jika hanya ``` tanpa 'json'
             jsonTextOutput = jsonTextOutput.substring(3); // Hapus ``` (3 karakter)
             if (jsonTextOutput.endsWith("```")) {
                jsonTextOutput = jsonTextOutput.substring(0, jsonTextOutput.length - 3); // Hapus ``` (3 karakter)
             }
        }
        jsonTextOutput = jsonTextOutput.trim(); // Trim lagi setelah membersihkan backtick
        // --- AKHIR BLOK PEMBERSIHAN ---

        // Untuk debug output setelah dibersihkan, uncomment baris berikut:
        // console.debug("DEBUG: Cleaned JSON text (setelah dibersihkan):\n", jsonTextOutput);

        try {
            const parsedJson = JSON.parse(jsonTextOutput);
            console.log("INFO: Output JSON dari Gemini berhasil diparsing.");
            return parsedJson;
        } catch (parseError) {
            console.error("ERROR: Gagal memparsing output JSON dari Gemini:", parseError.message);
            console.error("ERROR: Output mentah yang gagal diparsing (setelah dibersihkan):", jsonTextOutput);
            throw new Error(`Gagal memparsing output JSON dari Gemini. Output setelah dibersihkan (awal 500 karakter): ${jsonTextOutput.substring(0,500)}... Pastikan model menghasilkan JSON yang valid.`);
        }

    } catch (error) {
        console.error("ERROR: Saat berkomunikasi atau memproses dengan Gemini API:", error.message);
        // Cek jika error adalah dari API Google itu sendiri (misalnya, error.response ada jika menggunakan axios/fetch secara manual)
        // Pustaka @google/generative-ai mungkin sudah memformat errornya.
        if (error.stack) {
            console.error("ERROR: Stack trace:", error.stack);
        }
        // Jika error memiliki properti 'response' (seperti dari objek error API)
        if (error.response && error.response.promptFeedback) {
             console.error("ERROR: Gemini Prompt Feedback:", JSON.stringify(error.response.promptFeedback, null, 2));
        }
        if (error.response && error.response.candidates) {
            console.error("ERROR: Gemini Response Candidates:", JSON.stringify(error.response.candidates, null, 2));
        }

        throw new Error(`Gagal memproses dengan Gemini API: ${error.message || 'Unknown Gemini API error'}`);
    }
}

module.exports = { extractDetailsWithGemini };