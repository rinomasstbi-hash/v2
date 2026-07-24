import React, { useCallback, useState, useMemo } from 'react';

interface RPMOutputProps {
  htmlContent: string;
  isGenerating: boolean;
  onBack: () => void;
  showBackButton: boolean;
}

// Helper function to extract the learning topic from the generated HTML
const extractTopic = (html: string): string => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const cells = tempDiv.querySelectorAll('td');
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent?.trim() === 'Topik Pembelajaran') {
        // The topic is in the next cell
        return cells[i + 1]?.textContent?.trim() || 'Generated';
      }
    }
  } catch (e) {
    console.error("Gagal mem-parsing topik:", e);
  }
  return 'Generated'; // Default topic if not found
};

// Helper function to sanitize a string for use as a filename
const sanitizeFilename = (name: string): string => {
  // Remove invalid characters, replace spaces with underscores, and handle multiple underscores
  const sanitized = name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_');
  // Truncate to a reasonable length
  return sanitized.substring(0, 60);
};

// Helper function to shorten a topic to 1-2 significant words
const shortenTopic = (topic: string): string => {
  // Remove content in parentheses and trim whitespace
  const cleanedTopic = topic.replace(/\(.*?\)/g, '').trim();
  const words = cleanedTopic.split(/\s+/);
  
  // A simple list of common Indonesian stop words and verbs to ignore for filenames
  const stopWords = new Set([
      'dan', 'di', 'ke', 'dari', 'dengan', 'yang', 'untuk', 'pada', 'saat', 
      'adalah', 'yaitu', 'dalam', 'atas', 'sebagai', 'secara', 'melalui', 
      'tentang', 'studi', 'mengkaji', 'memahami', 'menganalisis', 'menjelaskan',
      'pembelajaran', 'materi', 'topik'
  ]);

  const significantWords = words.filter(word => 
    !stopWords.has(word.toLowerCase().replace(/[,.]/g, ''))
  );
  
  // Take the first 2 significant words. If none, take the original first two words.
  const finalWords = significantWords.length > 0 ? significantWords.slice(0, 2) : words.slice(0, 2);
  
  // Return joined words, or a default if empty
  return finalWords.join(' ') || 'Topik';
};


export const RPMOutput: React.FC<RPMOutputProps> = ({ htmlContent, isGenerating, onBack, showBackButton }) => {
  const [copyButtonText, setCopyButtonText] = useState('Salin & Buka di Google Dokumen');
  const [isCopying, setIsCopying] = useState(false);

  const processedHtml = useMemo(() => {
    if (!htmlContent) return '';
    let processed = htmlContent;

    // 1. Handle [Visual: https://...] links
    processed = processed.replace(
      /\[Visual: (https?:\/\/[^\s\]]+)\]/g,
      (_, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0891b2; text-decoration: underline; word-break: break-all;">${url}</a>`
    );
    
    // 2. Handle QR Code placeholders for QR code images
    processed = processed.replace(
      /\[QR Code: (https?:\/\/[^\s\]]+)\]/g,
      (_, url) => `
        <div style="text-align: center; margin: 1.5em auto; padding: 1em; border: 1px dashed #ccc; border-radius: 8px; max-width: 200px; background-color: #f9f9f9;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}" alt="QR Code for ${url}" style="display: block; margin: 0 auto;" />
          <p style="font-size: 0.8em; color: #555; margin-top: 0.5em; text-align: center; word-break: break-all;">Pindai untuk: ${url}</p>
        </div>
      `
    );

    // 3. Process Lampiran section to ensure left text alignment and no justification
    if (processed.includes('LAMPIRAN') || processed.includes('Lampiran')) {
      const lampiranIdx = processed.search(/<h[23][^>]*>.*?(LAMPIRAN|Lampiran)/i);
      if (lampiranIdx !== -1) {
        const mainPart = processed.substring(0, lampiranIdx);
        let lampiranPart = processed.substring(lampiranIdx);
        // Replace inline text-align: justify with text-align: left inside lampiranPart
        lampiranPart = lampiranPart.replace(/style="([^"]*?)text-align:\s*justify;?([^"]*?)"/gi, 'style="$1text-align: left;$2"');
        lampiranPart = lampiranPart.replace(/style='([^']*?)text-align:\s*justify;?([^']*?)'/gi, "style='$1text-align: left;$2'");
        processed = `${mainPart}<div class="lampiran-section" style="text-align: left;">${lampiranPart}</div>`;
      }
    }

    return processed;
  }, [htmlContent]);


  const handleCopyToGoogleDocs = useCallback(() => {
    if (isCopying || isGenerating) return;

    const outputElement = document.getElementById('printable-area');
    if (outputElement) {
      setIsCopying(true);
      let contentForClipboard = outputElement.innerHTML;
      
      contentForClipboard = contentForClipboard.replace(/border: 1px solid #ddd/g, 'border: 1px solid #000');
      contentForClipboard = contentForClipboard.replace(/background-color: #f2f2f2/g, 'background-color: #e0e0e0');

      const html = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
                @page {
                  size: A4 portrait;
                  margin: 2.0cm 2.0cm 2.0cm 2.0cm;
                }
                body { 
                  font-family: 'Times New Roman', Times, serif; 
                  font-size: 12pt; 
                  color: #000 !important; 
                  line-height: 1.5;
                }
                /* Center all tables and lock width to 481pt */
                table { 
                  border-collapse: collapse !important; 
                  width: 481pt !important; 
                  max-width: 481pt !important; 
                  table-layout: fixed !important; 
                  word-wrap: break-word !important; 
                  overflow-wrap: break-word !important; 
                  margin-left: auto !important;
                  margin-right: auto !important;
                  margin-top: 10pt !important;
                  margin-bottom: 10pt !important;
                }
                td, th { 
                  vertical-align: top; 
                  padding: 8px; 
                  border: 1px solid #000;
                  text-align: justify; 
                  text-justify: inter-word; 
                  word-wrap: break-word !important; 
                  overflow-wrap: break-word !important;
                }
                /* All LKPD and Lampiran Tables locked to 481pt fixed */
                table.lkpd-identity-table,
                table.lkpd-activity-table,
                table.lkpd-checklist-table,
                .lampiran-section table {
                  width: 481pt !important;
                  max-width: 481pt !important;
                  margin-left: auto !important;
                  margin-right: auto !important;
                  table-layout: fixed !important;
                }
                table.lkpd-activity-table col:nth-child(1),
                table.lkpd-activity-table th:nth-child(1),
                table.lkpd-activity-table td:nth-child(1) {
                  width: 30pt !important;
                }
                table.lkpd-activity-table col:nth-child(2),
                table.lkpd-activity-table th:nth-child(2),
                table.lkpd-activity-table td:nth-child(2) {
                  width: 97.24pt !important;
                }
                table.lkpd-activity-table col:nth-child(3),
                table.lkpd-activity-table th:nth-child(3),
                table.lkpd-activity-table td:nth-child(3) {
                  width: 353.76pt !important; /* 12.48 cm */
                }
                /* Signature Table Centering & Width */
                table.signature-table, table[style*="border: none"] { 
                  table-layout: fixed !important; 
                  width: 481pt !important; 
                  max-width: 481pt !important; 
                  margin-left: auto !important;
                  margin-right: auto !important;
                  border-collapse: collapse !important;
                  border: none !important; 
                  margin-top: 15pt !important;
                  margin-bottom: 15pt !important;
                }
                table.signature-table td, table[style*="border: none"] td { 
                  border: none !important; 
                  text-align: left !important; 
                  vertical-align: top !important; 
                  line-height: 1.2 !important;
                }
                table.signature-table td:first-child, table[style*="border: none"] td:first-child { width: 60% !important; text-align: left !important; }
                table.signature-table td:last-child, table[style*="border: none"] td:last-child { width: 40% !important; text-align: left !important; }
                
                /* Compact Bullets / Lists inside Tables (No large tab indentation) */
                table ul, table ol, td ul, td ol {
                  margin-top: 2pt !important;
                  margin-bottom: 4pt !important;
                  padding-left: 16pt !important;
                  margin-left: 0 !important;
                }
                table li, td li {
                  margin-bottom: 2pt !important;
                  padding-left: 0 !important;
                  text-align: left !important;
                }
                p { 
                  margin-top: 0; 
                  margin-bottom: 0.5em; 
                  text-align: justify; 
                  text-justify: inter-word; 
                  line-height: 1.5; 
                  word-wrap: break-word !important; 
                }
                ul, ol {
                  margin-top: 0;
                  margin-bottom: 0.5em;
                  padding-left: 20pt;
                }
                .lampiran-section, .lampiran-section p, .lampiran-section li, .lampiran-section td, .lampiran-section th {
                  text-align: left !important;
                  text-justify: auto !important;
                }
                .page-break { page-break-before: always; }
            </style>
          </head>
          <body>${contentForClipboard}</body>
        </html>
      `;
      
      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });

      navigator.clipboard.write([clipboardItem]).then(() => {
        setCopyButtonText('Berhasil disalin!');
        window.open('https://docs.google.com/document/create', '_blank');
        setTimeout(() => setCopyButtonText('Salin & Buka di Google Dokumen'), 3000);
      }).catch(err => {
        console.error('Gagal menyalin konten HTML: ', err);
        const plainText = outputElement.innerText;
        navigator.clipboard.writeText(plainText).then(() => {
            setCopyButtonText('Disalin sebagai teks biasa!');
            window.open('https://docs.google.com/document/create', '_blank');
            setTimeout(() => setCopyButtonText('Salin & Buka di Google Dokumen'), 3000);
        }).catch(err2 => {
            console.error('Gagal menyalin teks biasa: ', err2);
            setCopyButtonText('Gagal menyalin, coba manual');
            setTimeout(() => setCopyButtonText('Salin & Buka di Google Dokumen'), 3000);
        });
      }).finally(() => {
        setIsCopying(false);
      });
    }
  }, [isCopying, isGenerating]);

  const handleExportToDoc = useCallback(() => {
    if (isGenerating) return;

    const outputElement = document.getElementById('printable-area');
    if (!outputElement) {
      console.error("Area yang dapat dicetak tidak ditemukan");
      return;
    }

    let contentForDoc = outputElement.innerHTML;
    contentForDoc = contentForDoc.replace(/border: 1px solid #ddd/g, 'border: 1px solid #000');
    contentForDoc = contentForDoc.replace(/background-color: #f2f2f2/g, 'background-color: #e0e0e0');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Dokumen RPM</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
              /* --- Page & Margin Setup --- */
              @page {
                size: 210mm 297mm; /* Ukuran Kertas: A4 */
                margin: 2.0cm 2.0cm 2.0cm 2.0cm; /* Atas: 2.0cm, Bawah: 2.0cm, Kiri: 2.0cm, Kanan: 2.0cm */
                mso-header-margin: 36.0pt;
                mso-footer-margin: 36.0pt;
                mso-paper-source: 0;
              }
              @page Section1 {
                size: 210mm 297mm; /* Ukuran Kertas: A4 */
                mso-page-orientation: portrait; /* Orientasi: Portrait */
                margin: 2.0cm 2.0cm 2.0cm 2.0cm; /* Atas: 2.0 cm, Bawah: 2.0 cm, Kiri: 2.0 cm, Kanan: 2.0 cm */
              }
              div.Section1 {
                page: Section1;
              }

              /* --- General Styles --- */
              body { 
                font-family: 'Times New Roman', Times, serif; 
                font-size: 12pt; 
                line-height: 1.5; 
                color: #000;
              }
              br.page-break { page-break-before: always; }
              
              /* --- Table Styles (Centered & Fixed 481pt) --- */
              table { 
                border-collapse: collapse !important; 
                width: 481pt !important; 
                max-width: 481pt !important; 
                table-layout: fixed !important; 
                word-wrap: break-word !important; 
                overflow-wrap: break-word !important;
                margin-left: auto !important;
                margin-right: auto !important;
                margin-top: 10pt !important;
                margin-bottom: 10pt !important;
              }
              td, th { 
                vertical-align: top; 
                padding: 8px; 
                border: 1px solid #000; 
                text-align: justify; /* Rata kanan-kiri untuk tabel utama */
                text-justify: inter-word;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }

              /* --- LKPD Specific Column Widths (Fixed 481pt) --- */
              table.lkpd-identity-table,
              table.lkpd-activity-table,
              table.lkpd-checklist-table,
              .lampiran-section table {
                width: 481pt !important;
                max-width: 481pt !important;
                margin-left: auto !important;
                margin-right: auto !important;
                table-layout: fixed !important;
              }
              table.lkpd-activity-table col:nth-child(1),
              table.lkpd-activity-table th:nth-child(1),
              table.lkpd-activity-table td:nth-child(1) {
                width: 30pt !important;
              }
              table.lkpd-activity-table col:nth-child(2),
              table.lkpd-activity-table th:nth-child(2),
              table.lkpd-activity-table td:nth-child(2) {
                width: 97.24pt !important;
              }
              table.lkpd-activity-table col:nth-child(3),
              table.lkpd-activity-table th:nth-child(3),
              table.lkpd-activity-table td:nth-child(3) {
                width: 353.76pt !important; /* 12.48 cm */
              }

              /* --- Signature Table Styles --- */
              table.signature-table, table[style*="border: none"] {
                table-layout: fixed !important;
                width: 481pt !important;
                max-width: 481pt !important;
                margin-left: auto !important;
                margin-right: auto !important;
                border-collapse: collapse !important;
                border: none !important;
                margin-top: 15pt !important;
                margin-bottom: 15pt !important;
              }
              table.signature-table td, table[style*="border: none"] td {
                border: none !important;
                text-align: left !important;
                vertical-align: top !important;
                line-height: 1.2 !important;
              }
              table.signature-table td.col-kepala, table.signature-table td:first-child {
                width: 60% !important;
                text-align: left !important;
              }
              table.signature-table td.col-guru, table.signature-table td:last-child {
                width: 40% !important;
                text-align: left !important;
              }
              
              /* --- Bullet lists inside Tables (Compact without huge tab indentation) --- */
              table ul, table ol, td ul, td ol {
                margin-top: 2pt !important;
                margin-bottom: 4pt !important;
                padding-left: 16pt !important;
                margin-left: 0 !important;
              }
              table li, td li {
                margin-bottom: 2pt !important;
                padding-left: 0 !important;
                text-align: left !important;
              }

              /* --- Text Formatting Styles --- */
              p { 
                margin-top: 0; 
                margin-bottom: 0.5em; 
                text-align: justify; /* Rata kanan-kiri untuk paragraf utama */
                text-justify: inter-word;
                line-height: 1.5; 
                word-wrap: break-word !important;
              }
              h1, h2, h3, h4, h5, h6 {
                margin-top: 1.2em;
                margin-bottom: 0.6em;
                line-height: 1.2;
              }
              ul, ol {
                margin-top: 0;
                margin-bottom: 0.5em;
                padding-left: 20pt; 
              }

              /* --- Lampiran (Appendix) Text Alignment -> Left aligned, NOT justified --- */
              .lampiran-section, 
              .lampiran-section p, 
              .lampiran-section li, 
              .lampiran-section td, 
              .lampiran-section th,
              .lampiran-section div {
                text-align: left !important;
                text-justify: auto !important;
              }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${contentForDoc}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });

    const fullTopic = extractTopic(processedHtml);
    const shortTopic = shortenTopic(fullTopic);
    const filename = `RPM_${sanitizeFilename(shortTopic)}.doc`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [isGenerating, processedHtml]);
  
  const getButtonClass = () => {
    if (copyButtonText === 'Berhasil disalin!') {
      return 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-green-500/50 focus:ring-green-500';
    }
    if (copyButtonText.includes('Gagal')) {
        return 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg hover:shadow-red-500/50 focus:ring-red-500';
    }
    return 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:shadow-blue-500/50 focus:ring-blue-500';
  }

  return (
    <div className="space-y-4">
       <div className="space-y-3 no-print">
        {showBackButton && (
            <button
              onClick={onBack}
              className="w-full bg-white text-slate-700 font-bold py-3 px-4 rounded-lg border-2 border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center justify-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Kembali ke Formulir
            </button>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopyToGoogleDocs}
            disabled={isCopying || isGenerating}
            className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-wait ${getButtonClass()}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" />
              <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
            </svg>
            {isGenerating ? 'Menunggu proses 100%...' : copyButtonText}
          </button>
          <button
              onClick={handleExportToDoc}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-teal-600 to-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-teal-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-wait"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Ekspor ke Dokumen
          </button>
        </div>
       </div>
       <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-lg" role="alert">
        <p className="font-bold">RPM Berhasil Dibuat!</p>
        <p>Silakan lihat pratinjau dokumen di bawah, atau salin/ekspor menggunakan tombol di atas.</p>
      </div>

      {/* On-screen A4 document preview */}
      <div className="mt-6 p-3 sm:p-6 md:p-8 bg-slate-100/80 border border-slate-200 rounded-2xl overflow-x-auto shadow-inner">
        <style>{`
          #printable-area {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            color: #000;
            line-height: 1.5;
            background-color: #fff;
            width: 100%;
            max-width: 530pt;
            margin: 0 auto;
            padding: 24pt 24pt;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border-radius: 4px;
            border: 1px solid #cbd5e1;
          }
          #printable-area table {
            border-collapse: collapse !important;
            width: 481pt !important;
            max-width: 481pt !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 10pt !important;
            margin-bottom: 10pt !important;
            table-layout: fixed !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          #printable-area td, #printable-area th {
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
            text-align: justify;
            text-justify: inter-word;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          #printable-area table.lkpd-identity-table,
          #printable-area table.lkpd-activity-table,
          #printable-area table.lkpd-checklist-table,
          #printable-area .lampiran-section table {
            width: 481pt !important;
            max-width: 481pt !important;
            margin-left: auto !important;
            margin-right: auto !important;
            table-layout: fixed !important;
          }
          #printable-area table.lkpd-activity-table col:nth-child(1),
          #printable-area table.lkpd-activity-table th:nth-child(1),
          #printable-area table.lkpd-activity-table td:nth-child(1) { width: 30pt !important; }
          #printable-area table.lkpd-activity-table col:nth-child(2),
          #printable-area table.lkpd-activity-table th:nth-child(2),
          #printable-area table.lkpd-activity-table td:nth-child(2) { width: 97.24pt !important; }
          #printable-area table.lkpd-activity-table col:nth-child(3),
          #printable-area table.lkpd-activity-table th:nth-child(3),
          #printable-area table.lkpd-activity-table td:nth-child(3) { width: 353.76pt !important; }

          #printable-area table.signature-table, #printable-area table[style*="border: none"] {
            table-layout: fixed !important;
            width: 481pt !important;
            max-width: 481pt !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-collapse: collapse !important;
            border: none !important;
            margin-top: 15pt !important;
            margin-bottom: 15pt !important;
          }
          #printable-area table.signature-table td, #printable-area table[style*="border: none"] td {
            border: none !important;
            text-align: left !important;
            vertical-align: top !important;
            line-height: 1.2 !important;
          }
          #printable-area table.signature-table td:first-child { width: 60% !important; text-align: left !important; }
          #printable-area table.signature-table td:last-child { width: 40% !important; text-align: left !important; }

          #printable-area table ul, #printable-area table ol, #printable-area td ul, #printable-area td ol {
            margin-top: 2pt !important;
            margin-bottom: 4pt !important;
            padding-left: 16pt !important;
            margin-left: 0 !important;
          }
          #printable-area table li, #printable-area td li {
            margin-bottom: 2pt !important;
            padding-left: 0 !important;
            text-align: left !important;
          }
          #printable-area p {
            margin-top: 0;
            margin-bottom: 0.5em;
            text-align: justify;
            text-justify: inter-word;
            line-height: 1.5;
            word-wrap: break-word !important;
          }
          #printable-area .lampiran-section, 
          #printable-area .lampiran-section p, 
          #printable-area .lampiran-section li, 
          #printable-area .lampiran-section td, 
          #printable-area .lampiran-section th,
          #printable-area .lampiran-section div {
            text-align: left !important;
            text-justify: auto !important;
          }
        `}</style>
        <div 
          id="printable-area"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </div>
    </div>
  );
};