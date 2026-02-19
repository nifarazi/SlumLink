/**
 * eligible-families-table.js
 * Reusable component for displaying eligible families for a campaign
 * 
 * Usage:
 *   const table = new EligibleFamiliesTable('containerId');
 *   await table.load(campaignId);
 *   table.render();
 */

class EligibleFamiliesTable {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.data = null;
    this.campaign = null;
  }

  async load(campaignId, orgId = null) {
    try {
      const url = `/api/campaigns/${encodeURIComponent(campaignId)}/eligible-families`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load families: ${res.statusText}`);
      }
      const json = await res.json();
      this.data = json.data;
      return this.data;
    } catch (error) {
      console.error("Error loading eligible families:", error);
      throw error;
    }
  }

  async loadCampaignDetails(campaignId) {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`);
      if (!res.ok) throw new Error("Failed to load campaign");
      const json = await res.json();
      this.campaign = json.data;
      return this.campaign;
    } catch (error) {
      console.error("Error loading campaign details:", error);
      throw error;
    }
  }

  render() {
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }

    if (!this.data || !this.data.families) {
      this.container.innerHTML = `<div class="families-section"><p>No eligible families found.</p></div>`;
      return;
    }

    const families = this.data.families;
    const summary = this.data.summary || {};

    let html = `
      <div class="families-section">
        <h3>Eligible Families & Members</h3>
        <div class="families-summary">
          <div class="summary-item">
            <span class="summary-label">Total Families</span>
            <span class="summary-value">${summary.total_families || 0}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Eligible Individuals</span>
            <span class="summary-value">${summary.total_eligible_individuals || 0}</span>
          </div>
        </div>

        <div class="families-table-wrapper">
          <table class="families-table">
            <thead>
              <tr>
                <th>Slum Code</th>
                <th>Family Head</th>
                <th>Family Size</th>
                <th>Eligible Members</th>
                <th>Eligible Count</th>
              </tr>
            </thead>
            <tbody>
    `;

    families.forEach(family => {
      const familySize = family.total_family_members || 0;
      const eligibleCount = family.eligible_members_count || 0;
      const eligibleNames = family.eligible_member_names || family.family_head_name || "—";
      
      html += `
        <tr>
          <td class="slum-code"><strong>${this.escapeHtml(family.slum_code || "—")}</strong></td>
          <td>${this.escapeHtml(family.family_head_name || "—")}</td>
          <td>${familySize}</td>
          <td class="eligible-names">
            <small>${this.escapeHtml(eligibleNames)}</small>
          </td>
          <td class="eligible-count">${eligibleCount}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="families-footer">
          <div class="footer-totals">
            <span><strong>Total Families:</strong> ${summary.total_families || 0}</span>
            <span><strong>Total Eligible Individuals:</strong> ${summary.total_eligible_individuals || 0}</span>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="download-btn" onclick="window['downloadFamiliesReportCSV_' + '${this.containerId}']()">
              <i class="fas fa-download"></i> CSV
            </button>
            <button class="download-btn" onclick="window['downloadFamiliesReportPDF_' + '${this.containerId}']()">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attach download handlers
    window[`downloadFamiliesReportCSV_${this.containerId}`] = () => this.downloadReportCSV();
    window[`downloadFamiliesReportPDF_${this.containerId}`] = () => this.downloadReportPDF();
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  downloadReportCSV() {
    if (!this.data || !this.data.families) {
      alert("No data to download");
      return;
    }

    const families = this.data.families;
    const summary = this.data.summary || {};
    const campaign = this.campaign || {};

    // Create CSV content
    let csv = `SlumLink Campaign Eligible Families Report\n`;
    csv += `Campaign: ${campaign.title || "Unknown"}\n`;
    csv += `Status: ${campaign.status || "Unknown"}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += `Total Families,${summary.total_families || 0}\n`;
    csv += `Total Eligible Individuals,${summary.total_eligible_individuals || 0}\n\n`;

    csv += `Slum Code,Family Head,Family Size,Eligible Members,Eligible Count\n`;

    families.forEach(family => {
      const familySize = family.total_family_members || 0;
      const eligibleCount = family.eligible_members_count || 0;
      const eligibleNames = family.eligible_member_names || family.family_head_name || "";

      csv += `"${family.slum_code || ""}","${family.family_head_name || ""}",${familySize},"${eligibleNames}",${eligibleCount}\n`;
    });

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const fileName = `eligible-families-${campaign.campaign_id || 'report'}-${new Date().getTime()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadReportPDF() {
    if (!this.data || !this.data.families) {
      alert("No data to download");
      return;
    }

    // Check if jsPDF is available immediately or wait for it
    const generatePDF = () => {
      // Try multiple ways to detect jsPDF
      const jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
      
      if (!jsPDF) {
        alert("PDF library is still loading. Please try again in a moment.");
        return;
      }

      try {
        const families = this.data.families;
        const summary = this.data.summary || {};
        const campaign = this.campaign || {};

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 15;
        const margin = 15;

        // Title
        doc.setFontSize(16);
        doc.setTextColor(107, 61, 39);
        doc.text('Campaign Eligible Families Report', margin, yPosition);
        
        // Campaign info
        yPosition += 10;
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(`Campaign: ${campaign.title || 'Unknown'}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Status: ${campaign.status || 'Unknown'}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

        // Summary
        yPosition += 10;
        doc.setFontSize(12);
        doc.setTextColor(107, 61, 39);
        doc.text('Summary', margin, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`Total Families: ${summary.total_families || 0}`, margin + 5, yPosition);
        yPosition += 6;
        doc.text(`Total Eligible Individuals: ${summary.total_eligible_individuals || 0}`, margin + 5, yPosition);

        // Table
        yPosition += 12;
        const columns = ['Slum Code', 'Family Head', 'Size', 'Eligible Members', 'Count'];
        const rows = this.data.families.map(family => [
          family.slum_code || '—',
          family.family_head_name || '—',
          String(family.total_family_members || 0),
          family.eligible_member_names || '—',
          String(family.eligible_members_count || 0)
        ]);

        console.log('Creating table with', rows.length, 'rows');
        console.log('autoTable available?', typeof doc.autoTable === 'function');

        // Use autoTable if available
        if (typeof doc.autoTable === 'function') {
          try {
            doc.autoTable({
              head: [columns],
              body: rows,
              startY: yPosition,
              margin: { top: margin, left: margin, right: margin, bottom: margin },
              bodyStyles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [107, 61, 39], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
              columnStyles: {
                0: { cellWidth: 22 },  // Slum Code
                1: { cellWidth: 28 },  // Family Head
                2: { cellWidth: 14 },  // Size
                3: { cellWidth: 55 }, // Eligible Members
                4: { cellWidth: 15 }   // Count
              },
              didDrawPage: (data) => {
                // Footer
                const pageCount = doc.internal.getPages().length;
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.text(
                  `Page ${data.pageNumber} of ${pageCount}`,
                  pageWidth / 2,
                  pageHeight - 10,
                  { align: 'center' }
                );
              }
            });
            console.log('Table rendered successfully');
          } catch (tableError) {
            console.error('AutoTable error:', tableError);
            // Fallback: render table manually
            renderTableFallback(doc, yPosition, columns, rows);
          }
        } else {
          console.warn('AutoTable not available, using fallback');
          renderTableFallback(doc, yPosition, columns, rows);
        }

        doc.save(`eligible-families-${campaign.campaign_id || 'report'}-${Date.now()}.pdf`);
        console.log('PDF saved successfully');
      } catch (e) {
        console.error('PDF generation error:', e);
        alert('Error generating PDF: ' + e.message + '\n\nUse CSV download as an alternative.');
      }

      function renderTableFallback(doc, startY, headers, data) {
        let yPos = startY;
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const colWidths = [22, 28, 14, 55, 15];
        
        // Headers
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(107, 61, 39);
        let xPos = margin;
        headers.forEach((header, i) => {
          doc.rect(xPos, yPos, colWidths[i], 7, 'F');
          doc.text(header, xPos + 1, yPos + 5);
          xPos += colWidths[i];
        });
        yPos += 8;

        // Data rows
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        data.forEach((row, rowIdx) => {
          if (yPos > pageHeight - 15) {
            doc.addPage();
            yPos = 15;
          }
          
          xPos = margin;
          row.forEach((cell, colIdx) => {
            const cellText = String(cell).substring(0, 30);
            doc.text(cellText, xPos + 1, yPos + 4);
            doc.rect(xPos, yPos, colWidths[colIdx], 7);
            xPos += colWidths[colIdx];
          });
          yPos += 8;
        });
        console.log('Fallback table rendered');
      }
    };

    // If library available, generate now
    if (window.jsPDF || (window.jspdf && window.jspdf.jsPDF)) {
      generatePDF();
    } else {
      // Wait for library to load
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.jsPDF || (window.jspdf && window.jspdf.jsPDF)) {
          clearInterval(check);
          generatePDF();
        } else if (attempts > 30) {
          clearInterval(check);
          alert('PDF library could not be loaded. Using CSV download instead.');
        }
      }, 200);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EligibleFamiliesTable;
}
