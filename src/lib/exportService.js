import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

class ExportService {
  constructor() {
    this.exportFormats = ['PDF', 'DOCX', 'HTML', 'CSV', 'EPUB'];
  }

  async exportBook(book, chapters, format) {
    const operationId = `export-${book.id}-${format}`;
    
    try {
      switch (format.toUpperCase()) {
        case 'PDF':
          return await this.exportToPDF(book, chapters, operationId);
        case 'DOCX':
          return await this.exportToWord(book, chapters, operationId);
        case 'HTML':
          return await this.exportToHTML(book, chapters, operationId);
        case 'CSV':
          return await this.exportToCSV(book, chapters, operationId);
        case 'EPUB':
          return await this.exportToEPUB(book, chapters, operationId);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Export failed for ${format}:`, error);
      throw error;
    }
  }

  async exportToPDF(book, chapters, operationId) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add metadata
    pdf.setProperties({
      title: book.title,
      author: book.author || 'Unknown',
      subject: book.learning_objectives,
      creator: 'EbookAI Platform'
    });

    let currentPage = 1;
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Title page
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    const titleLines = pdf.splitTextToSize(book.title, pageWidth - 2 * margin);
    pdf.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 12;

    yPosition += 20;
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Target Audience: ${book.target_audience}`, margin, yPosition);
    yPosition += 10;
    pdf.text(`Created: ${new Date(book.created_at).toLocaleDateString()}`, margin, yPosition);

    // Table of Contents
    pdf.addPage();
    currentPage++;
    yPosition = margin;
    
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Table of Contents', margin, yPosition);
    yPosition += 20;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    
    chapters.forEach((chapter, chapterIndex) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        currentPage++;
        yPosition = margin;
      }
      
      pdf.text(`${chapterIndex + 1}. ${chapter.title}`, margin, yPosition);
      yPosition += 8;
      
      chapter.topics?.forEach((topic, topicIndex) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          currentPage++;
          yPosition = margin;
        }
        
        pdf.text(`  ${chapterIndex + 1}.${topicIndex + 1} ${topic.title}`, margin + 10, yPosition);
        yPosition += 6;
      });
      
      yPosition += 4;
    });

    // Content pages
    for (const [chapterIndex, chapter] of chapters.entries()) {
      pdf.addPage();
      currentPage++;
      yPosition = margin;

      // Chapter title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      const chapterTitle = `Chapter ${chapterIndex + 1}: ${chapter.title}`;
      pdf.text(chapterTitle, margin, yPosition);
      yPosition += 15;

      // Chapter topics
      for (const topic of chapter.topics || []) {
        if (topic.content) {
          yPosition = await this.addTopicToPDF(pdf, topic, yPosition, margin, pageWidth, pageHeight);
        }
      }
    }

    // Generate blob and download
    const pdfBlob = pdf.output('blob');
    this.downloadFile(pdfBlob, `${book.title}.pdf`, 'application/pdf');
    
    return { success: true, format: 'PDF', filename: `${book.title}.pdf` };
  }

  async addTopicToPDF(pdf, topic, yPosition, margin, pageWidth, pageHeight) {
    const maxWidth = pageWidth - 2 * margin;
    
    // Topic title
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    const topicTitleLines = pdf.splitTextToSize(topic.title, maxWidth);
    
    if (yPosition + topicTitleLines.length * 8 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.text(topicTitleLines, margin, yPosition);
    yPosition += topicTitleLines.length * 8 + 5;

    // Topic content (convert HTML to plain text for PDF)
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    
    const plainTextContent = this.htmlToPlainText(topic.content);
    const contentLines = pdf.splitTextToSize(plainTextContent, maxWidth);
    
    for (const line of contentLines) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    }
    
    yPosition += 10; // Space after topic
    return yPosition;
  }

  async exportToHTML(book, chapters, operationId) {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${book.title}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .book-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        .book-title {
            font-size: 2.5em;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        .book-meta {
            color: #7f8c8d;
            font-size: 1.1em;
        }
        .toc {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .toc h2 {
            color: #2c3e50;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
        }
        .toc ul {
            list-style: none;
            padding-left: 0;
        }
        .toc li {
            margin: 8px 0;
            padding: 5px 0;
        }
        .toc a {
            text-decoration: none;
            color: #3498db;
        }
        .toc a:hover {
            text-decoration: underline;
        }
        .chapter {
            margin: 50px 0;
            page-break-before: always;
        }
        .chapter-title {
            font-size: 2em;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .topic {
            margin: 30px 0;
        }
        .topic h2 {
            color: #34495e;
            font-size: 1.5em;
            margin-bottom: 15px;
        }
        .topic h3 {
            color: #34495e;
            font-size: 1.3em;
            margin: 20px 0 10px 0;
        }
        .topic h4 {
            color: #34495e;
            font-size: 1.1em;
            margin: 15px 0 8px 0;
        }
        .topic-image {
            text-align: center;
            margin: 20px 0;
        }
        .topic-image img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 10px 20px;
            background: #f8f9fa;
            font-style: italic;
        }
        code {
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        pre {
            background: #f1f2f6;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
        }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #7f8c8d;
        }
        @media print {
            .chapter {
                page-break-before: always;
            }
            .topic {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="book-header">
        <h1 class="book-title">${book.title}</h1>
        <div class="book-meta">
            <p>Target Audience: ${book.target_audience}</p>
            <p>Writing Style: ${book.writing_style} | Tone: ${book.tone}</p>
            <p>Created: ${new Date(book.created_at).toLocaleDateString()}</p>
        </div>
    </div>

    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
            ${chapters.map((chapter, chapterIndex) => `
                <li>
                    <a href="#chapter-${chapterIndex + 1}">
                        Chapter ${chapterIndex + 1}: ${chapter.title}
                    </a>
                    <ul style="margin-left: 20px; margin-top: 5px;">
                        ${chapter.topics?.map((topic, topicIndex) => `
                            <li>
                                <a href="#topic-${chapterIndex + 1}-${topicIndex + 1}">
                                    ${chapterIndex + 1}.${topicIndex + 1} ${topic.title}
                                </a>
                            </li>
                        `).join('') || ''}
                    </ul>
                </li>
            `).join('')}
        </ul>
    </div>

    ${chapters.map((chapter, chapterIndex) => `
        <div class="chapter" id="chapter-${chapterIndex + 1}">
            <h1 class="chapter-title">Chapter ${chapterIndex + 1}: ${chapter.title}</h1>
            ${chapter.description ? `<p class="chapter-description">${chapter.description}</p>` : ''}
            
            ${chapter.topics?.map((topic, topicIndex) => `
                <div class="topic" id="topic-${chapterIndex + 1}-${topicIndex + 1}">
                    ${topic.content || `<h2>${topic.title}</h2><p><em>Content not yet generated for this topic.</em></p>`}
                </div>
            `).join('') || ''}
        </div>
    `).join('')}

    <div class="footer">
        <p>Generated by EbookAI Platform</p>
        <p>Total Chapters: ${chapters.length} | Total Topics: ${chapters.reduce((sum, ch) => sum + (ch.topics?.length || 0), 0)}</p>
    </div>
</body>
</html>`;

    const htmlBlob = new Blob([html], { type: 'text/html' });
    this.downloadFile(htmlBlob, `${book.title}.html`, 'text/html');
    
    return { success: true, format: 'HTML', filename: `${book.title}.html` };
  }

  async exportToWord(book, chapters, operationId) {
    // Generate HTML content and convert to Word-compatible format
    let docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${book.title}</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
h1 { font-size: 18pt; font-weight: bold; page-break-before: always; }
h2 { font-size: 16pt; font-weight: bold; margin-top: 20pt; }
h3 { font-size: 14pt; font-weight: bold; margin-top: 16pt; }
h4 { font-size: 12pt; font-weight: bold; margin-top: 12pt; }
p { margin: 6pt 0; }
ul, ol { margin: 6pt 0; padding-left: 30pt; }
blockquote { margin: 12pt 30pt; padding: 6pt; border-left: 3pt solid #333; }
</style>
</head>
<body>
`;

    // Title page
    docContent += `
<div style='text-align: center; margin-bottom: 50pt;'>
    <h1 style='page-break-before: avoid;'>${book.title}</h1>
    <p><strong>Target Audience:</strong> ${book.target_audience}</p>
    <p><strong>Writing Style:</strong> ${book.writing_style}</p>
    <p><strong>Tone:</strong> ${book.tone}</p>
    <p><strong>Created:</strong> ${new Date(book.created_at).toLocaleDateString()}</p>
</div>
`;

    // Table of Contents
    docContent += `
<h1>Table of Contents</h1>
<ul>
${chapters.map((chapter, chapterIndex) => `
    <li>Chapter ${chapterIndex + 1}: ${chapter.title}
        <ul>
            ${chapter.topics?.map((topic, topicIndex) => `
                <li>${chapterIndex + 1}.${topicIndex + 1} ${topic.title}</li>
            `).join('') || ''}
        </ul>
    </li>
`).join('')}
</ul>
`;

    // Chapters content
    chapters.forEach((chapter, chapterIndex) => {
      docContent += `<h1>Chapter ${chapterIndex + 1}: ${chapter.title}</h1>`;
      if (chapter.description) {
        docContent += `<p>${chapter.description}</p>`;
      }
      
      chapter.topics?.forEach((topic) => {
        if (topic.content) {
          // Clean HTML for Word compatibility
          const cleanContent = topic.content
            .replace(/<img[^>]*>/g, '[IMAGE]') // Replace images with placeholder
            .replace(/<div[^>]*>/g, '<p>')
            .replace(/<\/div>/g, '</p>');
          docContent += cleanContent;
        } else {
          docContent += `<h2>${topic.title}</h2><p><em>Content not yet generated.</em></p>`;
        }
      });
    });

    docContent += '</body></html>';

    const docBlob = new Blob([docContent], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    this.downloadFile(docBlob, `${book.title}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    return { success: true, format: 'DOCX', filename: `${book.title}.docx` };
  }

  async exportToCSV(book, chapters, operationId) {
    const csvData = [];
    
    // Headers
    csvData.push([
      'Chapter Number',
      'Chapter Title', 
      'Topic Number',
      'Topic Title',
      'Topic Objectives',
      'Content Length (words)',
      'Status',
      'Has Image'
    ]);

    // Data rows
    chapters.forEach((chapter, chapterIndex) => {
      chapter.topics?.forEach((topic, topicIndex) => {
        const wordCount = topic.content ? topic.content.split(/\s+/).length : 0;
        const hasImage = topic.content ? topic.content.includes('<img') : false;
        
        csvData.push([
          chapterIndex + 1,
          `"${chapter.title}"`,
          topicIndex + 1,
          `"${topic.title}"`,
          `"${topic.objectives || ''}"`,
          wordCount,
          topic.status || 'draft',
          hasImage ? 'Yes' : 'No'
        ]);
      });
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadFile(csvBlob, `${book.title}_structure.csv`, 'text/csv');
    
    return { success: true, format: 'CSV', filename: `${book.title}_structure.csv` };
  }

  async exportToEPUB(book, chapters, operationId) {
    // Simplified EPUB export (would need JSZip for full EPUB format)
    const epubContent = await this.exportToHTML(book, chapters, operationId);
    
    // For now, export as HTML with EPUB extension
    const htmlContent = await this.generateHTMLContent(book, chapters);
    const epubBlob = new Blob([htmlContent], { type: 'application/epub+zip' });
    this.downloadFile(epubBlob, `${book.title}.epub`, 'application/epub+zip');
    
    return { success: true, format: 'EPUB', filename: `${book.title}.epub` };
  }

  htmlToPlainText(html) {
    // Simple HTML to plain text conversion
    return html
      .replace(/<h[1-6][^>]*>/g, '\n\n')
      .replace(/<\/h[1-6]>/g, '\n')
      .replace(/<p[^>]*>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<br[^>]*>/g, '\n')
      .replace(/<li[^>]*>/g, '\n• ')
      .replace(/<\/li>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  downloadFile(blob, filename, mimeType) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getSupportedFormats() {
    return this.exportFormats;
  }
}

export const exportService = new ExportService();