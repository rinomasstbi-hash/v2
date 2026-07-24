import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { RPMInput, IntegrationOption } from '../types';
import { fetchActiveApiKeys, reportApiKeyError } from './apiKeyService';

const SYSTEM_INSTRUCTION = `Anda adalah asisten ahli dalam pembuatan Rencana Pembelajaran Mendalam (RPM) untuk kurikulum madrasah di Indonesia, khususnya untuk MTsN 4 Jombang. Tugas Anda adalah membuat dokumen RPM yang lengkap, terstruktur, dan siap pakai dalam format HTML. Ikuti struktur dan instruksi di bawah ini dengan SANGAT TELITI menggunakan Ejaan Bahasa Indonesia yang baik dan benar. Pastikan semua teks berwarna hitam atau sangat gelap agar kontrasnya tinggi dan mudah dibaca. Jangan gunakan sintaks Markdown seperti **teks tebal** di dalam output HTML Anda; sebagai gantinya, gunakan tag HTML yang sesuai seperti \`<b>\` atau \`<strong>\`.

**INSTRUKSI UNTUK VISUAL DAN SUMBER DAYA EKSTERNAL:**
Jika materi pelajaran dapat diperkaya dengan visual (gambar, diagram, video) atau sumber daya online (simulasi, artikel), Anda HARUS menyediakan tautan langsung ke sumber daya tersebut menggunakan format placeholder berikut. JANGAN memberikan deskripsi atau saran visual jika tautan tidak tersedia; lewati saja.

1.  **Untuk Tautan Visual/Sumber Daya:** Gunakan format \`[Visual: https://contoh.link/sumberdaya]\`. Sistem akan mengubah ini menjadi tautan yang dapat diklik. Contoh: \`[Visual: https://www.youtube.com/watch?v=some_video]\`.

2.  **Untuk Kode QR (Akses Cepat):** Gunakan format \`[QR Code: https://contoh.link/sumberdaya]\` HANYA jika Anda ingin menyediakan akses cepat melalui pemindaian (misalnya untuk LKPD cetak). Sistem akan membuat kode QR dari tautan tersebut.`;

function createPrompt(data: RPMInput): string {
  const {
    teacherName,
    teacherNip,
    className,
    semester,
    subject,
    learningObjectives,
    subjectMatter,
    studentTarget,
    language,
    meetings,
    pedagogicalPractices,
    graduateDimensions,
    integrationOption
  } = data;

  const studentDescription = studentTarget && studentTarget.trim() !== ''
    ? studentTarget.trim()
    : `Generate deskripsi singkat karakteristik umum siswa kelas ${className} di madrasah tsaniyah.`;

  const practicesText = pedagogicalPractices
    .map((practice, index) => `Pertemuan ${index + 1}: ${practice}`)
    .join(', ');

  const kbcInstruction = `
    **INSTRUKSI INTEGRASI KBC (PENTING DAN SELALU DITERAPKAN):**
    Setiap kali Anda mengintegrasikan nilai dari "Topik Panca Cinta" (Kurikulum Berbasis Cinta/KBC) ke dalam aktivitas atau penjelasan, Anda HARUS:
    1. Membungkus teks yang relevan dengan tag \`<span style="background-color: #FDB5EE;">\`.
    2. Mengakhiri teks yang disorot dengan label tebal: \`<b>(KBC)</b>\`.
  `;

  let integrationPrompt = '';
  if (integrationOption === IntegrationOption.SRA) {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (SRA):**
      Integrasikan prinsip-prinsip Satuan Pendidikan Ramah Anak (SRA) berikut ke dalam aktivitas pembelajaran:
      - **Inklusif & Non-Diskriminatif:** Pastikan semua siswa merasa diterima dan dihargai tanpa memandang latar belakang.
      - **Partisipatif:** Rancang kegiatan yang mendorong siswa untuk aktif menyuarakan pendapat dan terlibat dalam pengambilan keputusan.
      - **Disiplin Positif:** Terapkan pendekatan disiplin tanpa kekerasan fisik/psikis dan tidak merendahkan martabat siswa dalam skenario interaksi guru-siswa.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang secara eksplisit mengintegrasikan nilai SRA, bungkus teks yang relevan dalam tag \`<span style="background-color: #37E69A;">\`.
        - AKHIRI teks yang disorot dengan penanda tebal yang spesifik, yang menjelaskan prinsip SRA yang sedang diintegrasikan. Contoh: \`<b>(Prinsip Partisipasi Anak)</b>\`, \`<b>(Pendekatan Disiplin Positif)</b>\`, atau \`<b>(Prinsip Inklusivitas)</b>\`. JANGAN gunakan label generik "Insersi Nilai SRA".
    `;
  } else if (integrationOption === IntegrationOption.LITERASI) {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (LITERASI):**
      Sisipkan kompetensi Literasi (pemahaman tekstual, inferensi, evaluasi) ke dalam modul ajar ini.
      Fokuskan modifikasi pada:
      - Aktivitas: Menggunakan stimulus berupa teks (artikel, berita, kutipan, atau studi kasus) yang relevan dengan materi.
      - Asesmen: Mengukur kemampuan penalaran dan analisis teks siswa terhadap stimulus tersebut.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang dimodifikasi untuk integrasi Literasi, bungkus teks yang relevan dalam tag \`<span style="background-color: #F0F32B;">\`.
        - Setelah teks yang disorot, tambahkan penanda tebal yang spesifik, yang menjelaskan kompetensi Literasi yang sedang diperkuat. Contoh: \`<b>(Penguatan Literasi: Evaluasi Teks)</b>\`, atau \`<b>(Penguatan Literasi: Pemahaman Tekstual)</b>\`. JANGAN gunakan label generik "Penguatan Literasi".

      **INSTRUKSI ASESMEN KHUSUS LITERASI (SANGAT PENTING):**
      Saat membuat soal untuk asesmen formatif dan sumatif, Anda HARUS mengikuti format soal HOTS (Higher-Order Thinking Skills) berbasis Literasi yang mengukur <b>PENALARAN TEKS</b>, bukan sekadar hafalan.
      
      <b>Format Wajib untuk Setiap Soal:</b>
      <ol style="list-style-type: none; padding-left: 0;">
        <li><b>1. Stimulus:</b> Awali SETIAP soal dengan stimulus berbasis teks yang relevan dengan materi. Stimulus dapat berupa:<br/>
        - Teks singkat (artikel, berita, kutipan)<br/>
        - Studi kasus singkat</li>
        <li><b>2. Pertanyaan:</b> Buat pertanyaan yang menuntut siswa untuk:<br/>
        - <b>Menganalisis:</b> Menguraikan informasi dari stimulus teks.<br/>
        - <b>Mengevaluasi:</b> Memberikan penilaian atau argumen berdasarkan stimulus teks.<br/>
        - <b>Menghubungkan:</b> Mengaitkan konsep dalam teks dengan konteks lain.</li>
      </ol>
      <b>Contoh Struktur:</b><br/>
      <i>[STIMULUS: Sebuah artikel pendek tentang sejarah penemuan...]</i><br/>
      <b>Pertanyaan:</b> Berdasarkan teks tersebut, simpulan apa yang bisa diambil tentang... Jelaskan alasanmu. <b>(Penguatan Literasi: Evaluasi Teks)</b>
    `;
  } else if (integrationOption === IntegrationOption.NUMERASI) {
    integrationPrompt = `
      **INSTRUKSI TAMBAHAN (NUMERASI):**
      Sisipkan kompetensi Numerasi (interpretasi data, penalaran matematis, pemecahan masalah) ke dalam modul ajar ini.
      Fokuskan modifikasi pada:
      - Aktivitas: Menggunakan stimulus berupa angka, data, tabel, statistik, atau infografis yang relevan dengan materi.
      - Asesmen: Mengukur kemampuan interpretasi data dan pemecahan masalah siswa terhadap stimulus tersebut.
      - **Penanda dan Pewarnaan (PENTING):**
        - Untuk setiap bagian yang dimodifikasi untuk integrasi Numerasi, bungkus teks yang relevan dalam tag \`<span style="background-color: #90CDF4;">\`.
        - Setelah teks yang disorot, tambahkan penanda tebal yang spesifik, yang menjelaskan kompetensi Numerasi yang sedang diperkuat. Contoh: \`<b>(Penguatan Numerasi: Interpretasi Data)</b>\`, atau \`<b>(Penguatan Numerasi: Pemecahan Masalah)</b>\`. JANGAN gunakan label generik "Penguatan Numerasi".

      **INSTRUKSI ASESMEN KHUSUS NUMERASI (SANGAT PENTING):**
      Saat membuat soal untuk asesmen formatif dan sumatif, Anda HARUS mengikuti format soal HOTS (Higher-Order Thinking Skills) berbasis Numerasi yang mengukur <b>PENALARAN DATA/ANGKA</b>, bukan sekadar hafalan.
      
      <b>Format Wajib untuk Setiap Soal:</b>
      <ol style="list-style-type: none; padding-left: 0;">
        <li><b>1. Stimulus:</b> Awali SETIAP soal dengan stimulus berbasis numerik/data yang relevan dengan materi. Stimulus dapat berupa:<br/>
        - Data (tabel, statistik)<br/>
        - Visual (grafik, diagram, infografis)</li>
        <li><b>2. Pertanyaan:</b> Buat pertanyaan yang menuntut siswa untuk:<br/>
        - <b>Menganalisis:</b> Menguraikan atau membaca tren dari data.<br/>
        - <b>Mengevaluasi:</b> Memberikan penilaian kuantitatif berdasarkan stimulus.<br/>
        - <b>Memecahkan masalah:</b> Menggunakan data untuk menarik simpulan atau solusi logis.</li>
      </ol>
      <b>Contoh Struktur:</b><br/>
      <i>[STIMULUS: Sebuah infografis statistik tentang...]</i><br/>
      <b>Pertanyaan:</b> Berdasarkan data pada infografis tersebut, apa yang akan terjadi jika... Jelaskan berdasarkan perhitungan atau tren data. <b>(Penguatan Numerasi: Interpretasi Data)</b>
    `;
  }
    
  let lkpdInstructions = '';
  for (let i = 0; i < meetings; i++) {
    const meetingNumber = i + 1;
    const practice = pedagogicalPractices[i];
    lkpdInstructions += `
        <br class="page-break" />
        <h3><b>Lampiran ${meetingNumber}: Lembar Kerja Peserta Didik (Pertemuan Ke-${meetingNumber})</b></h3>
          <p><b>PENTING:</b> Buat LKPD ini dalam format TABEL HTML yang rapi, terstruktur, dan mudah diisi siswa, yang disesuaikan secara khusus dengan praktik pedagogis <b>${practice}</b>.</p>

          <table class="lkpd-identity-table" width="100%" align="center" style="width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; table-layout: fixed; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; word-wrap: break-word;">
            <colgroup><col style="width: 50%;" /><col style="width: 50%;" /></colgroup>
            <tr style="background-color: #f2f2f2;">
              <th colspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 13pt;"><b>LEMBAR KERJA PESERTA DIDIK (LKPD) - PERTEMUAN KE-${meetingNumber}</b></th>
            </tr>
            <tr>
              <td style="width: 50%; border: 1px solid #000; padding: 8px; vertical-align: top; text-align: left;">
                <b>Nama Siswa / Kelompok:</b> ___________________________<br/>
                <b>Kelas / Semester:</b> ${className} / ${semester}<br/>
                <b>No. Absen / Anggota:</b> ___________________________
              </td>
              <td style="width: 50%; border: 1px solid #000; padding: 8px; vertical-align: top; text-align: left;">
                <b>Mata Pelajaran:</b> ${subject}<br/>
                <b>Materi / Topik:</b> ${subjectMatter}<br/>
                <b>Praktik Pedagogis:</b> ${practice}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; background-color: #fafafa; text-align: left;">
                <b>Petunjuk Pengerjaan:</b><br/>
                Tuliskan petunjuk pengerjaan LKPD yang jelas dan sistematis sesuai dengan sintaks <b>${practice}</b>.
              </td>
            </tr>
          </table>

          <table class="lkpd-activity-table" width="100%" align="center" style="width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; table-layout: fixed; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; word-wrap: break-word;">
            <colgroup>
              <col style="width: 22.68pt;" />
              <col style="width: 100.63pt;" />
              <col style="width: 354.05pt;" />
            </colgroup>
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 8px; width: 22.68pt; text-align: center;">No</th>
                <th style="border: 1px solid #000; padding: 8px; width: 100.63pt; text-align: left;">Tahapan Sintaks (${practice})</th>
                <th style="border: 1px solid #000; padding: 8px; width: 354.05pt; text-align: left;">Kegiatan & Tugas Peserta Didik</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; width: 22.68pt; text-align: center; vertical-align: top;">1</td>
                <td style="border: 1px solid #000; padding: 8px; width: 100.63pt; font-weight: bold; vertical-align: top; text-align: left;">1. Memahami (Pemahaman Konsep)</td>
                <td style="border: 1px solid #000; padding: 8px; width: 354.05pt; text-align: left; vertical-align: top;">
                  Sajikan ringkasan materi/konsep kunci yang relevan untuk pertemuan ini + 2-3 pertanyaan pemahaman dasar beserta tempat/ruang jawaban siswa.
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; width: 22.68pt; text-align: center; vertical-align: top;">2</td>
                <td style="border: 1px solid #000; padding: 8px; width: 100.63pt; font-weight: bold; vertical-align: top; text-align: left;">2. Mengaplikasikan (Aktivitas Utama Sintaks ${practice})</td>
                <td style="border: 1px solid #000; padding: 8px; width: 354.05pt; text-align: left; vertical-align: top;">
                  Berikan 1 tugas utama, studi kasus, atau langkah eksperimen/proyek yang mencerminkan sintaks <b>${practice}</b> secara nyata, dengan instruksi pengerjaan rinci dan ruang lembar pengerjaan siswa.
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; width: 22.68pt; text-align: center; vertical-align: top;">3</td>
                <td style="border: 1px solid #000; padding: 8px; width: 100.63pt; font-weight: bold; vertical-align: top; text-align: left;">3. Merefleksikan (Refleksi & Diskusi)</td>
                <td style="border: 1px solid #000; padding: 8px; width: 354.05pt; text-align: left; vertical-align: top;">
                  Berikan 2-3 pertanyaan refleksi mendalam mengenai pengalaman belajar siswa dengan metode <b>${practice}</b> pada pertemuan ini.
                </td>
              </tr>
            </tbody>
          </table>

          <table class="lkpd-checklist-table" width="100%" align="center" style="width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; table-layout: fixed; border-collapse: collapse; margin-top: 10px; border: 1px solid #000; word-wrap: break-word;">
            <colgroup><col style="width: 100%;" /></colgroup>
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 8px; width: 100%; text-align: left;">Ceklis Penilaian Diri & Catatan Guru:</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; width: 100%; text-align: left;">
                  Buatlah tabel ceklis pemahaman diri sederhana (misal: "Saya sudah memahami...", "Saya dapat mengaplikasikan...") serta kalimat penyemangat untuk peserta didik.
                </td>
              </tr>
            </tbody>
          </table>
    `;
  }

  let openingInstruction: string;
  let closingInstruction: string;

  switch (language) {
    case 'Bahasa Arab':
      openingInstruction = `**Mulai kegiatan awal dengan salam pembuka Islami yang interaktif dalam Bahasa Arab. PENTING: Tuliskan transliterasi Latin terlebih dahulu, diikuti dengan teks Arab asli dalam tanda kurung. Contoh: 'Assalamu'alaikum warahmatullahi wabarakatuh (السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ). Kaifa halukum jamian? (كَيْفَ حَالُكُمْ جَمِيْعًا؟) Mari kita mulai pelajaran hari ini dengan membaca doa bersama.' Buatlah kalimat yang mengajak siswa berinteraksi, BUKAN hanya salam saja.**`;
      closingInstruction = `**Akhiri kegiatan penutup dengan kalimat penutup yang interaktif dalam Bahasa Arab. PENTING: Tuliskan transliterasi Latin terlebih dahulu, diikuti dengan teks Arab asli dalam tanda kurung. Contoh: 'Alhamdulillah, kita telah menyelesaikan pelajaran hari ini. Hayya nakhtatim darsana bi qira'ati hamdalah (هيا نختتم درسنا بقراءة الحمدلة). Wassalamu'alaikum warahmatullahi wabarakatuh (وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ).' Buatlah kalimat penutup yang baik, BUKAN hanya salam saja.**`;
      break;
    case 'Bahasa Inggris':
      openingInstruction = `**Mulai kegiatan awal ini dengan salam pembuka yang interaktif dalam Bahasa Inggris. Contohnya, 'Good morning, class! How is everyone today? Let's start our lesson by...' Buatlah kalimat yang mengajak siswa berinteraksi, BUKAN hanya salam saja.**`;
      closingInstruction = `**Akhiri kegiatan penutup ini dengan kalimat penutup yang interaktif dalam Bahasa Inggris. Contohnya, 'Alright everyone, that's all for today. Do you have any questions? See you next time! Good bye.' Buatlah kalimat penutup yang baik, BUKAN hanya salam saja.**`;
      break;
    default:
      openingInstruction = `**Mulai kegiatan awal dengan salam pembuka.**`;
      closingInstruction = `**Akhiri kegiatan penutup dengan salam penutup.**`;
  }

  let assessmentSectionHtml = `
    <br class="page-break" />
    <h3><b>Lampiran ${meetings + 1}: Instrumen Asesmen</b></h3>
      <h4><b>A. Asesmen Diagnostik (Awal)</b></h4>
      <p>Buat 5 soal pertanyaan pemantik atau kuis singkat yang relevan dengan materi, beserta kunci jawabannya, untuk mengukur pemahaman awal siswa.</p>
      
      <h4><b>B. Instrumen Asesmen Formatif</b></h4>
      <p><b>PENTING:</b> Buat instrumen yang relevan dengan metode asesmen formatif yang Anda jelaskan di bagian E.2. Misalnya: Jika penilaian LKPD, buat rubrik penilaian detail untuk setiap LKPD. Jika observasi, buat lembar ceklis observasi partisipasi siswa.</p>
      
      <h4><b>C. Instrumen Asesmen Sumatif</b></h4>
      <p><b>PENTING:</b> Buat instrumen yang relevan dengan metode asesmen sumatif yang Anda jelaskan di bagian E.3. Misalnya: Jika tes tulis, buat 5-10 soal pilihan ganda atau esai lengkap dengan kunci jawaban dan pedoman penskoran. Jika penilaian proyek/produk, buat rubrik penilaian yang komprehensif.</p>
      
      <h4><b>D. Rubrik Penilaian Sikap</b></h4>
      <p>Buat satu tabel rubrik HTML untuk menilai sikap siswa yang mencakup dimensi lulusan yang dipilih (misalnya: Bernalar Kritis, Kreatif, Gotong Royong, dll.).</p>
  `;

  if (integrationOption === IntegrationOption.LITERASI || integrationOption === IntegrationOption.NUMERASI) {
    const isLiterasi = integrationOption === IntegrationOption.LITERASI;
    const label = isLiterasi ? "Literasi" : "Numerasi";
    assessmentSectionHtml = `
    <br class="page-break" />
    <h3><b>Lampiran ${meetings + 1}: Instrumen Asesmen</b></h3>
      <h4><b>A. Asesmen Diagnostik (Awal)</b></h4>
      <p>Buat 5 soal pertanyaan pemantik atau kuis singkat yang relevan dengan materi, beserta kunci jawabannya, untuk mengukur pemahaman awal siswa.</p>
      
      <h4><b>B. Instrumen Asesmen Formatif (Berbasis ${label})</b></h4>
      <p>Buatlah instrumen asesmen formatif (misalnya, soal analisis kasus dalam LKPD). Pastikan setiap soal mengikuti format HOTS berbasis ${label} (Stimulus lalu Pertanyaan) seperti yang telah diinstruksikan sebelumnya, lengkap dengan kunci jawaban dan pedoman penskoran. Ingat untuk menerapkan penandaan ${label} <span style="background-color: ${isLiterasi ? '#F0F32B' : '#90CDF4'};">(warna disorot)</span> pada soal yang Anda buat.</p>
      
      <h4><b>C. Instrumen Asesmen Sumatif (Berbasis ${label})</b></h4>
      <p>Buatlah 5-10 soal untuk asesmen sumatif (bisa pilihan ganda atau esai). Pastikan setiap soal mengikuti format HOTS berbasis ${label} (Stimulus lalu Pertanyaan) seperti yang telah diinstruksikan sebelumnya, lengkap dengan kunci jawaban dan pedoman penskoran. Ingat untuk menerapkan penandaan ${label} <span style="background-color: ${isLiterasi ? '#F0F32B' : '#90CDF4'};">(warna disorot)</span> pada soal yang Anda buat.</p>
      
      <h4><b>D. Rubrik Penilaian Sikap</b></h4>
      <p>Buat satu tabel rubrik HTML untuk menilai sikap siswa yang mencakup dimensi lulusan yang dipilih (misalnya: Bernalar Kritis, Kreatif, Gotong Royong, dll.).</p>
    `;
  }


  return `
    Berdasarkan input berikut:
    - Nama Guru: ${teacherName}
    - NIP Guru: ${teacherNip}
    - Kelas: ${className}
    - Semester: ${semester}
    - Mata Pelajaran: ${subject}
    - Tujuan Pembelajaran: ${learningObjectives}
    - Materi Pelajaran: ${subjectMatter}
    - Karakteristik Siswa: ${studentTarget ? studentTarget : 'Otomatis oleh AI'}
    - Bahasa Pembuka/Penutup: ${language}
    - Jumlah Pertemuan: ${meetings}
    - Praktik Pedagogis per Pertemuan: ${practicesText}
    - Dimensi Lulusan: ${graduateDimensions.join(', ')}
    - Opsi Integrasi: ${integrationOption}

    ${kbcInstruction}
    ${integrationPrompt}

    **ATURAN GAYA PENTING (PERATAAN TEKS):** 
    - Untuk semua teks paragraf, daftar (list), dan konten di dalam tabel Pengalaman Belajar (Tabel RPM Utama), Anda dapat menerapkan gaya perataan rata kanan-kiri (\`style="text-align: justify;"\`).
    - NAMUN, UNTUK SELURUH BAGIAN LAMPIRAN (termasuk LKPD dan Instrumen Asesmen), Anda HARUS menggunakan perataan TEKS KIRI STANDAR (\`style="text-align: left;"\`) dan DILARANG KERAS menggunakan justify.

    **ATURAN POSISI & UKURAN TABEL (PASTI CENTER & KANAN-KIRI PAS DI MS WORD):**
    - Seluruh tabel yang Anda buat (Tabel RPM Utama, Tabel Tanda Tangan, Tabel LKPD, dan Tabel Asesmen) HARUS diposisikan TEPAT DI TENGAH DOKUMEN dengan menambahkan atribut \`width="100%" align="center"\` serta gaya \`margin-left: auto; margin-right: auto;\` pada tag \`<table>\`.
    - Atribut utama setiap tabel wajib disetel: \`width="100%" align="center" style="width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; table-layout: fixed; border-collapse: collapse; word-wrap: break-word; overflow-wrap: break-word;"\`.
    - DILARANG KERAS menentukan lebar tabel atau kolom dalam angka 'pt' atau 'px' absolut yang besar (seperti 481pt, 353pt, atau 600px) karena akan membuat tabel mekar dan melebihi margin kertas A4 di MS Word. SELALU gunakan persentase (%) yang totalnya tepat 100%!
    
    **ATURAN KHUSUS SELURUH TABEL LKPD & ASESMEN (PENGUNCIAN KOLOM):**
    - Setiap tabel di LKPD dan Lampiran (Tabel Identitas, Tabel Aktivitas Pedagogis \`class="lkpd-activity-table"\`, Tabel Ceklis Penilaian Diri, Rubrik Penilaian, dan Tabel Asesmen) HARUS menggunakan \`width="100%" align="center"\` dengan \`table-layout: fixed\`.
    - Pada Tabel LKPD Tahapan Pedagogis (3 kolom, \`class="lkpd-activity-table"\`):
      1. Kolom 1 (No): \`width="0.8cm"\` (22.68pt)
      2. Kolom 2 (Tahapan Sintaks): \`width="3.55cm"\` (100.63pt)
      3. Kolom 3 (Kegiatan & Tugas Peserta Didik): \`width="12.49cm"\` (354.05pt) - SANGAT PENTING: Lebar Kolom 3 DILOCK DENGAN TEPAT 12,49 cm dan DILARANG MELEBIHI HALAMAN! Jika membuat lembar titik-titik jawaban (answer line), GUNAKAN SPASI di antara titik-titik (misal: \`. . . . . . . . . .\`) agar teks tidak berupa string tanpa putus yang melebar menembus batas halaman.
    - Pada Tabel LKPD Identitas: Kolom 1 \`width="50%"\`, Kolom 2 \`width="50%"\`.
    - Pada Tabel Asesmen & Rubrik lainnya, pastikan total penjumlahan seluruh lebar kolom selalu pas dengan lebar margin kertas.

    **ATURAN DAFTAR BULLET/POIN DAN PENOMORAN (SPESIAL HANGING BY 0,63 CM - SANGAT PENTING):**
    - Setiap kali membuat daftar poin (\`<ul><li>\`) atau penomoran (\`<ol><li>\`) di bagian RPM maupun Lampiran, gunakan tag HTML \`<ul>\` atau \`<ol>\` standar tanpa menambah simbol manual seperti \`-\` atau \`•\`.
    - Atur seluruh daftar bullet dan penomoran agar MEMILIKI INDENTASI HANGING TEPAT 0,63 CM (\`hanging by 0.63cm\`):
      - Untuk \`<ul>\` disetel \`style="list-style-type: disc; list-style-position: outside; padding-left: 0.63cm; margin-left: 0pt; text-indent: 0pt; margin-top: 2pt; margin-bottom: 2pt;"\`
      - Untuk \`<ol>\` disetel \`style="list-style-type: decimal; list-style-position: outside; padding-left: 0.63cm; margin-left: 0pt; text-indent: 0pt; margin-top: 2pt; margin-bottom: 2pt;"\`
      - Untuk \`<li>\` disetel \`style="margin-left: 0pt; padding-left: 0pt; text-indent: 0pt; margin-bottom: 2pt;"\`
    - DILARANG KERAS menggunakan padding/margin kiri sembarangan agar poin bullet dan angka SELALU MUNCUL DENGAN JELAS, rapi hanging by 0,63 cm.

    **ATURAN PEMISAH HALAMAN (SANGAT PENTING):**
    Untuk memulai halaman baru, sisipkan tag **hanya-satu** \`<br class="page-break" />\` TEPAT SEBELUM elemen judul (\`<h2>\` atau \`<h3>\`) dari setiap bagian yang harus memulai halaman baru. Ini berlaku untuk judul utama "Lampiran" dan untuk setiap sub-lampiran (misalnya, "Lampiran 1", "Lampiran 2", "Instrumen Asesmen").
    **DILARANG KERAS:** Jangan pernah menggunakan \`<div class="page-break">\` atau menerapkan gaya CSS \`page-break-before: always\` secara langsung pada elemen lain seperti \`<p>\`, \`<div>\`, \`<li>\`, atau di dalam tabel. Metode \`<br class="page-break" />\` adalah satu-satunya cara yang diizinkan.

    **ATURAN KONTEN BERSIH (SANGAT PENTING):**
    JANGAN PERNAH membuat tag HTML yang kosong atau hanya berisi spasi. Contoh yang DILARANG: \`<p></p>\`, \`<p>&nbsp;</p>\`, \`<li></li>\`. Setiap tag harus berisi konten yang substantif untuk mencegah adanya baris-baris kosong yang tidak perlu dalam dokumen akhir.

    **STRUKTUR OUTPUT HTML UTAMA:**

    Gunakan sebuah div kontainer utama dengan gaya \`style="color: #000;"\`. Di dalamnya, buatlah struktur berikut:

    1.  **Tabel RPM (Dua Kolom):** Buat sebuah tabel HTML (\`<table>\`) dengan gaya \`style="width: 100%; table-layout: fixed; border-collapse: collapse; word-wrap: break-word;"\`. Kolom pertama adalah "Komponen" dan kedua "Isi". 
        - Gunakan \`<thead>\` untuk header.
        - Gunakan \`<tbody>\` untuk konten.
        - Untuk setiap baris komponen, gunakan \`<tr>\`.
        - Kolom "Komponen" (\`<td>\`) harus bold dan rata atas (\`style="font-weight: bold; vertical-align: top; width: 30%; padding: 8px; border: 1px solid #ddd;"\`).
        - Kolom "Isi" (\`<td>\`) harus diberi gaya \`style="width: 70%; padding: 8px; border: 1px solid #ddd;"\`. Gunakan aturan gaya umum untuk perataan teks paragraf di dalamnya.
        - Untuk header seksi seperti "IDENTITAS", gunakan \`<tr style="background-color: #f2f2f2;"><td colspan="2" style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">NAMA SEKSI</td></tr>\`.

    **Isi Tabel RPM:**

    a. **IDENTITAS**
       - Nama Madrasah: MTsN 4 Jombang
       - Mata Pelajaran: ${subject}
       - Kelas/Semester: ${className} / ${semester}
       - Durasi Pertemuan: ${meetings} x (2 x 40 menit)

    b. **IDENTIFIKASI**
       - Siswa: ${studentDescription}
       - Materi Pelajaran: ${subjectMatter}
       - Capaian Dimensi Lulusan: ${graduateDimensions.join(', ')}
       - Topik Panca Cinta: Analisislah materi pelajaran dan tujuan pembelajaran untuk memilih 2-3 dimensi Kurikulum Berbasis Cinta (KBC) yang paling relevan dari daftar berikut: [Cinta Allah dan Rasul-Nya, Cinta Ilmu, Cinta Lingkungan, Cinta Diri dan Sesama, Cinta Tanah Air].
       - Materi Insersi: Untuk setiap Topik Panca Cinta yang dipilih, tuliskan satu kalimat singkat yang menggambarkan nilai cinta yang diintegrasikan dalam pembelajaran.

    c. **DESAIN PEMBELAJARAN**
       - Lintas Disiplin Ilmu: Generate 1-2 disiplin ilmu lain yang relevan dengan materi.
       - Tujuan Pembelajaran: ${learningObjectives}
       - Topik Pembelajaran: Buat judul topik yang lebih spesifik dan menarik dari input 'Materi Pelajaran'.
       - Praktik Pedagogis per Pertemuan: ${practicesText}
       - Kemitraan Pembelajaran: Generate saran kemitraan yang relevan (misal: orang tua, perpustakaan sekolah).
       - Lingkungan Pembelajaran: Generate saran lingkungan belajar yang sesuai (misal: di dalam kelas, di luar kelas, laboratorium).
       - Pemanfaatan Digital: Generate saran tools digital relevan beserta tautan (contoh: Quizizz, Canva, YouTube).

    d. **PENGALAMAN BELAJAR**
       - Memahami (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan awal. ${openingInstruction} Setelah menjelaskan tujuan, tambahkan satu paragraf singkat untuk membangun koneksi emosional siswa dengan mengaitkan materi pada salah satu nilai KBC (ingat untuk menerapkan penanda dan pewarnaan KBC sesuai instruksi di atas).
       - Mengaplikasi (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan inti detail untuk setiap pertemuan sesuai sintaks dari praktik pedagogis masing-masing (${practicesText}). Tambahkan instruksi spesifik untuk mendorong refleksi nilai KBC dalam aktivitas (ingat untuk menerapkan penanda dan pewarnaan KBC sesuai instruksi di atas).
       - Refleksi (berkesadaran, bermakna, menggembirakan): Generate langkah-langkah kegiatan penutup. ${closingInstruction}

    e. **ASESMEN PEMBELAJARAN**
       - Asesmen Awal (diagnostik/apersepsi): Jelaskan metode asesmen awal (misal: pertanyaan pemantik lisan, kuis singkat).
       - Asesmen Formatif (for/as learning): Jelaskan metode asesmen formatif (misal: observasi partisipasi, penilaian LKPD, penilaian antar teman).
       - Asesmen Sumatif (of learning): Jelaskan metode asesmen sumatif (misal: tes tulis di akhir bab, penilaian proyek, presentasi).

    2.  **Tanda Tangan:** Setelah tabel utama, buatlah sebuah tabel baru untuk bagian tanda tangan dengan atribut dan gaya persis berikut:
        \`<table class="signature-table" width="100%" align="center" style="width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; table-layout: fixed; border-collapse: collapse; border: none; margin-top: 20px; margin-bottom: 20px;">\`
        \`<colgroup><col style="width: 50%;" /><col style="width: 50%;" /></colgroup>\`
        \`<tr>\`
          \`<td class="col-kepala" style="width: 50%; border: none; text-align: left; vertical-align: top; line-height: 1.4; padding: 4pt;">Mengetahui,<br/>Kepala MTsN 4 Jombang<br/><br/><br/><br/><b>Dr. Aziz Ja'far, S.Th.I., M.Pd.I</b><br/>NIP. 197610062007101008</td>\`
          \`<td class="col-guru" style="width: 50%; border: none; text-align: left; vertical-align: top; line-height: 1.4; padding: 4pt;">Jombang, [Generate tanggal hari ini format DD MMMM YYYY]<br/>Guru Mata Pelajaran<br/><br/><br/><br/><b>${teacherName}</b><br/>NIP. ${teacherNip}</td>\`
        \`</tr>\`
        \`</table>\`
        **PENTING:** Lebar kolom disetel 50% dan 50% serta \`table-layout: fixed\` tanpa border agar tanda tangan tampil rapi, sejajar, dan pas dengan lebar halaman A4.

    3.  **LAMPIRAN:** Bungkus seluruh bagian Lampiran di dalam sebuah div dengan kelas 'lampiran-section' dan gaya \`style="text-align: left;"\`:
        \`<br class="page-break" />\`
        \`<div class="lampiran-section" style="text-align: left;">\`
          \`<h2 style="text-align: center; font-size: 24pt; font-weight: bold;">LAMPIRAN-LAMPIRAN</h2>\`
          ${lkpdInstructions}
          ${assessmentSectionHtml}
        \`</div>\`

    Pastikan seluruh output adalah satu blok kode HTML yang valid dan rapi.
    `;
}

export const MISSING_API_KEY_ERROR = "Tidak ada Kunci API Gemini yang aktif. Admin perlu menambahkan API Key ke dalam Pool pada Admin Dashboard.";

export const generateRPM = async (data: RPMInput): Promise<AsyncGenerator<GenerateContentResponse>> => {
  // 1. Fetch active keys from Firestore Pool
  const poolKeys = await fetchActiveApiKeys();

  // Prepare list of key objects to try
  const keyList: Array<{ id?: string; key: string; label: string }> = [];

  if (poolKeys.length > 0) {
    // Shuffle pool keys to distribute load evenly
    const shuffled = [...poolKeys].sort(() => Math.random() - 0.5);
    shuffled.forEach(k => keyList.push({ id: k.id, key: k.key, label: k.label }));
  }

  // Fallback to environment variable if set
  const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '') {
    keyList.push({ key: envKey.trim(), label: 'Default System Key' });
  }

  if (keyList.length === 0) {
    throw new Error(MISSING_API_KEY_ERROR);
  }

  const prompt = createPrompt(data);
  let lastError: any = null;

  // Try keys in pool one by one
  for (let i = 0; i < keyList.length; i++) {
    const currentKeyObj = keyList[i];
    try {
      console.log(`Menggunakan API Key: ${currentKeyObj.label} (Attempt ${i + 1}/${keyList.length})`);
      const ai = new GoogleGenAI({ apiKey: currentKeyObj.key });
      const model = 'gemini-2.5-flash';

      const response = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      return response;
    } catch (error: any) {
      console.warn(`Gagal menggunakan key (${currentKeyObj.label}):`, error);
      lastError = error;

      // Report error to Firestore if it has a pool ID
      if (currentKeyObj.id) {
        await reportApiKeyError(currentKeyObj.id);
      }

      // If there are more keys to try, continue loop!
    }
  }

  // If all keys failed
  console.error("Semua API Key dalam pool gagal merespon:", lastError);
  if (lastError instanceof Error) {
    if (lastError.message.includes('503') || lastError.message.includes('UNAVAILABLE') || lastError.message.includes('high demand')) {
      throw new Error("SERVER_BUSY");
    }
    throw new Error(`Terjadi masalah saat berkomunikasi dengan layanan AI: ${lastError.message}`);
  }

  throw new Error("Gagal berkomunikasi dengan layanan AI. Terjadi kesalahan yang tidak diketahui.");
};