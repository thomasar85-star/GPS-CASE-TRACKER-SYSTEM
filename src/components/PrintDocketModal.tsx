import React from 'react';
import { Shield, Printer, X, Download } from 'lucide-react';
import { CaseRecord } from '../types';
import { formatOfficerDisplayName } from '../utils/security';

interface PrintDocketModalProps {
  caseRecord: CaseRecord;
  onClose: () => void;
}

export const PrintDocketModal: React.FC<PrintDocketModalProps> = ({ caseRecord, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300">
        {/* Action Header (Hidden in Print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 rounded-t-xl print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-[#0A2A66]" />
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
              Official Police Case File Jacket (Print Preview)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Print Official Jacket</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 overflow-y-auto font-serif text-slate-900 space-y-6 print:p-0 print:m-0">
          {/* Header Crest & National Authority */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="flex justify-center items-center space-x-3 mb-1">
              <div className="w-10 h-10 border-2 border-slate-900 rounded-lg flex items-center justify-center bg-slate-50">
                <Shield className="w-6 h-6 text-[#0A2A66]" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-black uppercase tracking-wider text-[#0A2A66]">
                  Ghana Police Service
                </h1>
                <p className="text-xs font-sans uppercase font-bold tracking-widest text-slate-700">
                  Criminal Investigation Department (C.I.D.)
                </p>
              </div>
            </div>
            <p className="text-xs font-sans uppercase text-slate-600 mt-1 font-semibold">
              {caseRecord.stationName} • DOCKET RECORD SHEET
            </p>
          </div>

          {/* Docket Meta Strip */}
          <div className="grid grid-cols-3 gap-2 border-2 border-slate-900 p-3 font-sans text-xs bg-slate-50">
            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Police Docket No:</span>
              <span className="font-mono font-black text-sm text-[#0A2A66]">{caseRecord.docketNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Offence Category:</span>
              <span className="font-bold uppercase text-slate-800">{caseRecord.offenceCategory.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Current Legal Status:</span>
              <span className="font-bold uppercase text-slate-900">{caseRecord.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Incident Specification */}
          <div className="border border-slate-400 p-4 space-y-2 font-sans text-xs">
            <h3 className="font-serif font-bold text-sm text-[#0A2A66] uppercase border-b border-slate-300 pb-1 flex justify-between">
              <span>I. Charge &amp; Statutory Particulars</span>
              <span className="font-mono text-xs text-slate-700">Act 29 / 1960</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Offence Title:</strong> {caseRecord.offenceTitle}
              </div>
              <div>
                <strong>Statute / Act 29 Section:</strong> {caseRecord.act29Section || 'Criminal Offences Act, 1960 (Act 29)'}
              </div>
              <div className="col-span-2">
                <strong>Statute Citation:</strong> {caseRecord.statuteCitation || 'Criminal Offences Act, 1960 (Act 29) of Ghana'}
              </div>
              <div>
                <strong>Incident Date:</strong> {new Date(caseRecord.incidentDateTime).toLocaleString('en-GB')}
              </div>
              <div>
                <strong>Incident Location / Division:</strong> {caseRecord.locationDescription}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <strong>Statement of Fact:</strong>
              <p className="mt-1 text-slate-800 leading-relaxed italic bg-slate-50 p-2.5 rounded border border-slate-200">
                "{caseRecord.narrative}"
              </p>
            </div>
          </div>

          {/* Complainant & Suspect Parties */}
          <div className="grid grid-cols-2 gap-4 font-sans text-xs">
            {/* Complainant */}
            <div className="border border-slate-400 p-3 space-y-1">
              <h4 className="font-serif font-bold text-xs uppercase text-[#0A2A66] border-b border-slate-300 pb-1">
                II. Complainant Details
              </h4>
              <p><strong>Name:</strong> {caseRecord.complainant.fullName}</p>
              <p><strong>Ghana Card:</strong> {caseRecord.complainant.ghanaCardId || 'N/A'}</p>
              <p><strong>Phone:</strong> {caseRecord.complainant.phone}</p>
              <p><strong>Address:</strong> {caseRecord.complainant.address}</p>
            </div>

            {/* Suspects */}
            <div className="border border-slate-400 p-3 space-y-1">
              <h4 className="font-serif font-bold text-xs uppercase text-[#0A2A66] border-b border-slate-300 pb-1">
                III. Suspect Record ({caseRecord.suspects.length})
              </h4>
              {caseRecord.suspects.length === 0 ? (
                <p className="text-slate-500 italic">No suspects recorded at intake.</p>
              ) : (
                caseRecord.suspects.map(s => (
                  <div key={s.id} className="border-b border-slate-200 pb-1 last:border-0">
                    <p><strong>Name:</strong> {s.fullName} {s.alias ? `(alias "${s.alias}")` : ''}</p>
                    <p><strong>Ghana Card:</strong> {s.ghanaCardId || 'N/A'}</p>
                    <p><strong>Arrest / Remand Status:</strong> {s.arrestStatus.toUpperCase()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submissions & Findings Trail */}
          <div className="border border-slate-400 p-4 font-sans text-xs space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#0A2A66] uppercase border-b border-slate-300 pb-1">
              IV. Official Submissions &amp; Endorsement Directives
            </h3>
            <div className="space-y-2">
              {caseRecord.submissions.map(sub => (
                <div key={sub.id} className="border-b border-slate-200 pb-2 last:border-0">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>• {sub.title} ({sub.submissionType.toUpperCase()})</span>
                    <span className="font-mono text-[10px] text-slate-500">{new Date(sub.timestamp).toLocaleString('en-GB')}</span>
                  </div>
                  <p className="text-slate-700 italic mt-0.5">{sub.content}</p>
                  <span className="text-[10px] text-slate-500 block">Attested By: {formatOfficerDisplayName(sub.officerRank, sub.officerName)} ({sub.officerBadge})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Sign-off Box */}
          <div className="grid grid-cols-3 gap-6 pt-6 font-sans text-xs text-center">
            <div className="border-t border-slate-800 pt-2">
              <span className="font-bold block">Station Officer Sign &amp; Date</span>
              <span className="text-[10px] text-slate-500">Charge Office Intake</span>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <span className="font-bold block">Investigator (CID) Sign &amp; Date</span>
              <span className="text-[10px] text-slate-500">Officer In Charge</span>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <span className="font-bold block">Senior Commander Endorsement</span>
              <span className="text-[10px] text-slate-500">Divisional Commander</span>
            </div>
          </div>

          <div className="text-center font-sans text-[10px] text-slate-400 border-t border-slate-200 pt-2">
            Ghana Police Service Confidential Case Record • Academic Capstone System Prototype
          </div>
        </div>
      </div>
    </div>
  );
};
