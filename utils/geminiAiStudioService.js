// OCR-APP-BACKEND/utils/geminiAiStudioService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
  console.error("ERROR: GEMINI_API_KEY tidak valid atau belum diatur di file .env. Aplikasi mungkin tidak akan berfungsi dengan benar.");
}

//  generationConfig dan safetySettings
const generationConfig = {
  temperature: 0.1, // Rendah untuk output yang lebih konsisten dan faktual
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096, // untuk JSON output yang kompleks
  responseMimeType: "application/json", // untuk meminta output JSON langsung
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
const promptInvoice = (ocrText) => `
    Anda adalah sistem AI yang sangat canggih untuk ekstraksi data dari teks invoice hasil OCR dari industri farmasi dan alat kesehatan di Indonesia.
    Tugas Anda adalah membaca teks berikut, mengidentifikasi semua informasi kunci, dan mengembalikannya dalam format JSON yang ketat.

    Teks Invoice (hasil OCR):
    \`\`\`text
    ${ocrText}
    \`\`\`

    Format JSON yang WAJIB diikuti (gunakan nilai null jika tidak ditemukan):
    {
      "informasi_umum": {
        "tipe_dokumen": "string", // "INVOICE PEMBELIAN" atau "FAKTUR PENJUALAN"
        "judul_dokumen": "string | null", // "INVOICE", "FAKTUR", "DELIVERY ORDER"
        "nomor_dokumen": "string | null",
        "nomor_faktur_pajak": "string | null",
        "nomor_purchase_order": "string | null",
        "nomor_sales_order": "string | null",
        "tanggal_terbit": "string (YYYY-MM-DD) | null",
        "tanggal_jatuh_tempo": "string (YYYY-MM-DD) | null",
        "nama_salesman": "string | null"
      },
      "pihak_terlibat": {
        "vendor": {
          "nama": "string | null",
          "alamat": "string | null",
          "telepon": "string | null",
          "npwp": "string | null"
        },
        "pelanggan": {
          "nama": "string | null",
          "alamat_penagihan": "string | null",
          "alamat_pengiriman": "string | null",
          "telepon": "string | null",
          "npwp": "string | null"
        }
      },
      "item_baris": [
        {
          "deskripsi": "string",
          "kuantitas": "number",
          "satuan": "string | null", // e.g., pcs, box
          "harga_satuan": "number",
          "diskon_persen": "number | null",
          "diskon_jumlah": "number | null",
          "total_harga": "number",
          "nomor_batch": "string | null",
          "tanggal_kedaluwarsa": "string (YYYY-MM-DD) | null"
        }
      ],
      "rekapitulasi_finansial": {
        "subtotal": "number | null",
        "total_diskon_global_jumlah": "number | null", // Dari "Potongan" atau "Total Discount"
        "dasar_pengenaan_pajak_dpp": "number | null",
        "pajak_ppn_jumlah": "number | null",
        "ongkos_kirim": "number | null",
        "biaya_meterai": "number | null",
        "total_tagihan_akhir": "number",
        "mata_uang": "string (IDR, USD, dll.) | null",
        "terbilang": "string | null"
      },
      "detail_pembayaran": {
        "metode": "string | null",
        "nama_bank": "string | null",
        "nomor_rekening": "string | null",
        "nama_pemilik_rekening": "string | null"
      },
      "informasi_legal_otorisasi": {
        "nama_penandatangan": "string | null",
        "jabatan_penandatangan": "string | null",
        "nomor_sipa": "string | null", // Surat Izin Praktik Apoteker
        "nomor_sik": "string | null", // Surat Izin Kerja
        "catatan": "string | null"
      }
    }

    INSTRUKSI PENTING:
    1. Kepatuhan pada skema JSON adalah prioritas utama.
    2. Identifikasi apakah ini "INVOICE PEMBELIAN" (jika perusahaan Anda adalah pelanggan) atau "FAKTUR PENJUALAN" (jika perusahaan Anda adalah vendor), isi di 'tipe_dokumen'.
    3. Ekstrak SEMUA item baris. Jika tidak ada, kembalikan array kosong [].
    4. Konversi semua nilai numerik ke tipe 'number'. Bersihkan 'Rp', koma ribuan, dan gunakan titik desimal.
    5. Format tanggal HARUS YYYY-MM-DD.
    6. Output HANYA berupa JSON yang valid. JANGAN tambahkan teks penjelasan atau markdown.
    `;

const promptSTNK = (ocrText) => `
Anda adalah sistem AI yang sangat canggih untuk ekstraksi data dari dokumen STNK kendaraan di Indonesia.
Tugas Anda adalah membaca teks hasil OCR berikut, mengidentifikasi semua informasi penting, dan mengembalikannya dalam format JSON yang ketat dan sesuai.

Teks STNK (hasil OCR):
\`\`\`text
${ocrText}
\`\`\`

Format JSON yang WAJIB diikuti (gunakan nilai null jika tidak ditemukan):

{
  "data_kendaraan": {
    "no": "string | null",
    "nomor_registrasi": "string | null",
    "nama_pemilik": "string | null",
    "alamat": "string | null",
    "merk": "string | null",
    "tipe": "string | null",
    "jenis": "string | null",
    "model": "string | null",
    "tahun_pembuatan": "string | null",
    "isi_silinder_daya_listrik": "string | null",
    "nomor_rangka": "string | null",
    "nomor_mesin": "string | null",
    "nik": "string | null",
    "warna": "string | null",
    "bahan_bakar": "string | null",
    "warna_tnkb": "string | null",
    "tahun_registrasi": "string | null",
    "nomor_bpkb": "string | null", // 9 digit kode lokasi + nomor urut pendaftaran (misal: I-xxxxxxxx atau xxxxxxxxx)
    "no_urut_pendaftaran": "string | null", // format: xxx/xxxx-xxx/XXX/xxxxxxxx
    "kode_lokasi": "string | null",
    "berlaku_sampai": "date (YYYY-MM-DD) | null",
  },
  "catatan_khusus": "string | null"
}

INSTRUKSI PENTING:
1. Patuhi struktur JSON secara ketat.
2. Konversi semua tanggal ke format YYYY-MM-DD bila memungkinkan.
3. Bersihkan teks dari karakter yang tidak relevan seperti titik dua ganda atau spasi berlebih
4. Jika nilai tidak ditemukan, isi dengan **null**.
5. Output HANYA berupa JSON valid tanpa teks tambahan, komentar, atau markdown.
6. Bedakan antara nomor 1 dan huruf 'I' atau 'l' (gunakan konteks untuk menentukan).
`;

const promptBPKB = (ocrText) => `
Anda adalah sistem AI yang sangat canggih untuk ekstraksi data dari dokumen BPKB (Buku Pemilik Kendaraan Bermotor) di Indonesia.
Tugas Anda adalah membaca teks hasil OCR berikut, mengidentifikasi semua informasi penting, dan mengembalikannya dalam format JSON yang ketat dan valid.

Teks BPKB (hasil OCR):
\`\`\`text
${ocrText}
\`\`\`

Format JSON yang WAJIB diikuti (gunakan nilai null jika tidak ditemukan):

{
  "no": "string | null" (contoh data pada raw OCR No.: 11467205 | G-12345678),
  "identitas_pemilik": {
    "nama_pemilik": "string | null",
    "pekerjaan": "string | null",
    "alamat": "string | null",
    "nomor_ktp": "string | null",
    "lokasi_dikeluarkan": "string | null",
    "tanggal_dikeluarkan": "string (
  },
  "identitas_kendaraan": {
    "nomor_registrasi": "string | null" (pastikan kode  lokasi sesuai dengan data kota lokasi pemilik),
    "merk": "string | null",
    "tipe": "string | null",
    "jenis": "string | null",
    "model": "string | null",
    "tahun_pembuatan": "string | null",
    "isi_silinder": "string | null",
    "warna": "string | null",
    "nomor_rangka": "string | null",
    "nomor_mesin": "string | null",
    "bahan_bakar": "string | null",
    "jumlah_sumbu": "string | null",
    "jumlah_roda": "string | null",
    "no_sertifikat_uji_tipe": "string | null",
    "jenis_kendaraan_kategori": "string | null",
  },
  "dokumen_registrasi_pertama": {
    "nomor_faktur": "string | null",
    "tanggal": "string (YYYY-MM-DD) | null",
    "atpm_importir": "string | null",
    "nomor_pib": "string | null",
    "nomor_sut": "string | null",
    "no_form_abc": "string | null",
    "kantor_bea_cukai": "string | null",
    "lain_lain": {
        "no_risalah_lelang": "string | null",
        "no_skep_DUM": "string | null",
    }
  },
  "perubahan_identitas": {
    "perubahan": "string | null",
    "jenis_perubahan": "string | null",
    "lokasi_perubahan_dikeluarkan": "string | null",
    "tanggal_perubahan_dikeluarkan": "string (YYYY-MM-DD) | null"
  },
  "catatan_khusus": "string | null"
}

INSTRUKSI PENTING:
1. Patuhi struktur JSON secara ketat.
2. Format semua tanggal ke bentuk **YYYY-MM-DD** jika memungkinkan.
3. Bersihkan teks dari karakter tidak relevan seperti titik dua ganda, spasi ekstra.
4. Jika data tidak ditemukan, isi dengan **null**.
5. Output hanya berupa JSON valid tanpa tambahan penjelasan, markdown, atau komentar apa pun.
`;

const promptKTP = (ocrText) => `
Anda adalah sistem AI yang sangat canggih untuk ekstraksi data dari dokumen KTP di Indonesia.
Tugas Anda adalah membaca teks hasil OCR berikut, mengidentifikasi semua informasi penting, dan mengembalikannya dalam format JSON yang ketat dan sesuai.

Teks KTP (hasil OCR):
\`\`\`text
${ocrText}
\`\`\`

Format JSON yang WAJIB diikuti (gunakan nilai null jika tidak ditemukan, namun sebisa mungkin isi semua data):

{
  "data_penduduk": {
    "nik": "string | null", // identifikasi format NIK (16 digit angka, contoh: 3277024156270024 )
    "nama": "string | null", // identifikasi format NIK (16 digit angka, contoh: 3277024156270024 )
    "tempat_tgl_lahir": "string | null",
    "jenis_kelamin": "string | null",
    "gol_darah": "string | null",
    "alamat": "string | null",
    "rt": "string | null",
    "rw": "string | null",
    "kel_desa": "string | null",
    "kecamatan": "string | null",
    "agama": "string | null",
    "status_perkawinan": "string | null",
    "kewarganegaraan": "string | null",
    "berlaku_hingga": "string | null",
    "provinsi": "string | null",
    "kabupaten_kota": "string | null",
    "tanggal_dibuat": "string | null" (sebelum tanda tangan pada KTP),
  },
  "catatan_khusus": "string | null"
}

INSTRUKSI PENTING:
1. Seluruh data wajib diidentifikasi dan diisi, terutama NIK dan Nama.
2. Patuhi struktur JSON secara ketat.
3. Konversi semua tanggal ke format YYYY-MM-DD bila memungkinkan.
4. Bersihkan teks dari karakter yang tidak relevan seperti titik dua ganda, spasi berlebih, atau pemisah yang tidak standar.
5. Jika nilai tidak ditemukan, isi dengan **null**.
6. Output HANYA berupa JSON valid tanpa teks tambahan, komentar, atau markdown.
`;

const promptGeneralDocument = (ocrText) => `
    Sebagai seorang business analyst, analisis teks dari dokumen berikut.
    Berikan output dalam format JSON berisi ringkasan, poin-poin kunci, dan insight penting.
    Identifikasi juga meta dokumen seperti penulis atau tanggal.
    
    PENTING:
    1. Berikan tebakan KATEGORI UMUM untuk dokumen ini di field "possible_document_type". Contoh kategori: "Ebook", "CV", "Surat Resmi", "Formulir", "Ijazah", "Kartu Identitas", dan lain-lain.
    2. Seluruh output dan teks di dalam JSON harus dalam Bahasa Indonesia.

    Teks Dokumen:
    \`\`\`text
    ${ocrText}
    \`\`\`

    Format JSON Output yang Diharapkan:
    {
      "ringkasan": "string",
      "poin_kunci": [
        "string",
        "string",
        "..."
      ],
      "insight_potensial": "string",
      "meta_dokumen": {
        "kemungkinan_penulis": "string | null",
        "kemungkinan_tanggal_terbit": "string (YYYY-MM-DD) | null",
        "possible_document_type": "string"
      }
    }
`;

async function getInsightsFromDocument(ocrText) {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        generationConfig: { responseMimeType: "application/json" } // Meminta output JSON
    });

    const prompt = promptGeneralDocument(ocrText);
    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Error saat mendapatkan insight dari dokumen:", error);
        throw new Error("Gagal menganalisis dokumen umum dengan Gemini.");
    }
}



async function identifyDocumentType(ocrText) {
  const models = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // Atau "gemini-pro"
  });
const prompt = `
    Analisis teks berikut dan tentukan jenisnya. Jawabanmu HARUS 'INVOICE', 'STNK', 'BPKB', 'KTP', atau 'TIDAK_DIKETAHUI'.
    
    Petunjuk:
    - BPKB adalah dokumen berbentuk buku yang berisi salah satu ini, "Identitas Pemilik", "Identitas Kendaraan", dan "Dokumen Registrasi Pertama", "Informasi Perubahan".
    - STNK adalah Surat Tanda Nomor Kendaraan Bermotor berupa satu lembar yang berisi detail pajak tahunan seperti "PKB" dan "SWDKLLJ".
    - INVOICE adalah tagihan pembayaran dengan rincian item, harga, dan total.
    - KTP adalah Kartu Tanda Penduduk yang berisi informasi pribadi seperti NIK, nama, alamat, dan tanggal lahir.
    - TIDAK_DIKETAHUI jika tidak dapat diidentifikasi dari pilihan di atas.

    Jawabanmu hanya satu kata saja.

    Teks: """${ocrText}"""
`;  try {
    const result = await models.generateContent(prompt);
    const documentType = result.response.text().trim().toUpperCase();
    if (['INVOICE', 'STNK', 'BPKB', 'KTP'].includes(documentType)) {
      return documentType;
    }
    return 'TIDAK_DIKETAHUI';
  } catch (error) {
    console.error("Error saat identifikasi dokumen:", error);
    return 'TIDAK_DIKETAHUI';
  }
}

async function extractDetailsWithGemini(ocrText, type) {
  // Pengecekan API Key lagi sebelum setiap panggilan (meskipun sudah dicek di atas, ini untuk keamanan fungsi)
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error("Gemini API Key tidak valid atau belum dikonfigurasi. Tidak dapat melanjutkan.");
  }
  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim() === "") {
    throw new Error("Teks OCR yang diberikan kosong atau tidak valid. Tidak dapat diproses oleh Gemini.");
  }

  const fullPrompt = 
  type === 'INVOICE' ? promptInvoice(ocrText) 
  : type === 'STNK' ? promptSTNK(ocrText) 
  : type === 'KTP' ? promptKTP(ocrText) 
  : promptBPKB(ocrText);

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
      throw new Error(`Gagal memparsing output JSON dari Gemini. Output setelah dibersihkan (awal 500 karakter): ${jsonTextOutput.substring(0, 500)}... Pastikan model menghasilkan JSON yang valid.`);
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

module.exports = { extractDetailsWithGemini, identifyDocumentType, getInsightsFromDocument  };