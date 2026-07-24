import React, { useState, useEffect, useCallback } from 'react';
import { RPMInput, PedagogicalPractice, GraduateDimension, IntegrationOption } from '../types';
import { PEDAGOGICAL_PRACTICES, GRADUATE_DIMENSIONS, SUBJECTS } from '../constants';

interface RPMFormProps {
  onSubmit: (data: RPMInput) => void;
  isLoading: boolean;
}

const InputField: React.FC<{
  id: string,
  label: string,
  type?: string,
  value: string | number,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  required?: boolean,
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'],
  pattern?: string,
}> = ({ id, label, type = "text", value, onChange, required = true, inputMode, pattern }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      min={type === 'number' ? 1 : undefined}
      inputMode={inputMode}
      pattern={pattern}
      className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-slate-50 text-slate-900 transition"
    />
  </div>
);

const TextareaField: React.FC<{ 
  id: string, 
  label: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  rows?: number,
  required?: boolean,
  placeholder?: string,
  helperText?: string
}> = ({ id, label, value, onChange, rows = 3, required = true, placeholder, helperText }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
    <textarea
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-slate-50 text-slate-900 transition"
    />
    {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
  </div>
);


export const RPMForm: React.FC<RPMFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<RPMInput>({
    teacherName: '',
    teacherNip: '',
    className: 'VII',
    semester: 'I',
    subject: SUBJECTS[0],
    learningObjectives: '',
    subjectMatter: '',
    studentTarget: '',
    language: 'Tidak Ada',
    meetings: 1,
    pedagogicalPractices: [PEDAGOGICAL_PRACTICES[0]],
    graduateDimensions: [],
    integrationOption: IntegrationOption.NONE,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof RPMInput, string>>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      // Special handling for the number of meetings to update dependent state atomically
      if (name === 'meetings') {
        // Allow only digits
        if (!/^\d*$/.test(value)) {
            return prev;
        }

        const numValue = value === '' ? 0 : parseInt(value, 10);
        
        // Adjust the pedagogical practices array to match the new number of meetings
        const newPractices = Array.from(
          { length: numValue },
          (_, i) => prev.pedagogicalPractices[i] || PEDAGOGICAL_PRACTICES[0]
        );

        return {
          ...prev,
          meetings: numValue,
          pedagogicalPractices: newPractices,
        };
      }
      
      // Handle all other form fields generically
      return { ...prev, [name]: value };
    });
  }, []);

  const handlePracticeChange = useCallback((index: number, value: PedagogicalPractice) => {
    setFormData(prev => {
      const newPractices = [...prev.pedagogicalPractices];
      newPractices[index] = value;
      return { ...prev, pedagogicalPractices: newPractices };
    });
  }, []);

  const handleDimensionChange = useCallback((dimension: GraduateDimension) => {
    setFormData(prev => {
      const newDimensions = prev.graduateDimensions.includes(dimension)
        ? prev.graduateDimensions.filter(d => d !== dimension)
        : [...prev.graduateDimensions, dimension];
      return { ...prev, graduateDimensions: newDimensions };
    });
  }, []);
  
  const handleFillExample = useCallback(() => {
    setFormData({
        teacherName: 'Siti Aminah, S.Ag.',
        teacherNip: '198805202012012002',
        className: 'IX',
        semester: 'V',
        subject: "Al-Qur'an Hadis (Qurdits)",
        learningObjectives: 'Siswa mampu menganalisis kandungan Q.S. al-An\'am: 162-163 dan Hadis riwayat Bukhari Muslim tentang ikhlas dalam beribadah, serta mengaitkannya dengan perilaku dalam kehidupan sehari-hari.',
        subjectMatter: 'Ikhlas dalam Beribadah (Studi Q.S. al-An\'am: 162-163 dan Hadis Terkait)',
        studentTarget: 'Siswa kelas IX madrasah tsanawiyah dengan latar belakang pemahaman yang beragam, aktif berdiskusi, dan menyukai gaya belajar kontekstual.',
        language: 'Bahasa Arab',
        meetings: 2,
        pedagogicalPractices: [PedagogicalPractice.CTL, PedagogicalPractice.COOPERATIVE],
        graduateDimensions: [GraduateDimension.FAITH, GraduateDimension.CRITICAL_REASONING, GraduateDimension.INDEPENDENCE],
        integrationOption: IntegrationOption.SRA,
    });
  }, []);

  const validateForm = () => {
      const newErrors: Partial<Record<keyof RPMInput, string>> = {};
      if (!formData.teacherName.trim()) newErrors.teacherName = "Nama Guru wajib diisi.";
      if (!formData.teacherNip.trim()) newErrors.teacherNip = "NIP Guru wajib diisi.";
      if (!formData.subject.trim()) newErrors.subject = "Mata Pelajaran wajib diisi.";
      if (!formData.learningObjectives.trim()) newErrors.learningObjectives = "Tujuan Pembelajaran wajib diisi.";
      if (!formData.subjectMatter.trim()) newErrors.subjectMatter = "Materi Pelajaran wajib diisi.";
      if (formData.meetings < 1) newErrors.meetings = "Jumlah Pertemuan minimal 1.";
      if (formData.graduateDimensions.length === 0) newErrors.graduateDimensions = "Pilih minimal satu Dimensi Lulusan.";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
        onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 2 Bilah (Kiri & Kanan) Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BILAH KIRI: Identitas Guru & Informasi Kelas */}
        <div className="space-y-6 bg-slate-50/70 p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-2 flex items-center gap-2 text-cyan-700 font-bold text-base">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3>Bilah 1: Identitas Guru & Kelas</h3>
          </div>

          <div>
            <InputField id="teacherName" label="Nama Guru" value={formData.teacherName} onChange={handleChange} />
            {errors.teacherName && <p className="text-red-500 text-sm mt-1">{errors.teacherName}</p>}
          </div>

          <div>
            <InputField id="teacherNip" label="NIP Guru" type="text" value={formData.teacherNip} onChange={handleChange} />
            {errors.teacherNip && <p className="text-red-500 text-sm mt-1">{errors.teacherNip}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="className" className="block text-sm font-semibold text-slate-600 mb-1">Kelas</label>
              <select id="className" name="className" value={formData.className} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-slate-900 transition">
                <option>VII</option>
                <option>VIII</option>
                <option>IX</option>
              </select>
            </div>
            <div>
              <label htmlFor="semester" className="block text-sm font-semibold text-slate-600 mb-1">Semester</label>
              <select id="semester" name="semester" value={formData.semester} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-slate-900 transition">
                <option>I</option>
                <option>II</option>
                <option>III</option>
                <option>IV</option>
                <option>V</option>
                <option>VI</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-slate-600 mb-1">Mata Pelajaran</label>
            <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-slate-900 transition">
                {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-semibold text-slate-600 mb-1">Bahasa Pembuka/Penutup</label>
            <select id="language" name="language" value={formData.language} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-slate-900 transition">
              <option>Tidak Ada</option>
              <option>Bahasa Arab</option>
              <option>Bahasa Inggris</option>
            </select>
          </div>

          <div>
            <InputField 
              id="meetings" 
              label="Jumlah Pertemuan" 
              type="text" 
              value={formData.meetings || ''} 
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]*"
              required={false}
            />
            {errors.meetings && <p className="text-red-500 text-sm mt-1">{errors.meetings}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Praktik Pedagogis per Pertemuan</label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Array.from({ length: formData.meetings }).map((_, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-600 w-28 flex-shrink-0">Pertemuan {index + 1}:</span>
                  <select 
                    value={formData.pedagogicalPractices[index] || ''}
                    onChange={(e) => handlePracticeChange(index, e.target.value as PedagogicalPractice)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-slate-900 transition"
                  >
                    {PEDAGOGICAL_PRACTICES.map(practice => <option key={practice} value={practice}>{practice}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BILAH KANAN: Materi & Parameter Kurikulum */}
        <div className="space-y-6 bg-slate-50/70 p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-2 flex items-center gap-2 text-teal-700 font-bold text-base">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3>Bilah 2: Materi & Parameter Kurikulum</h3>
          </div>

          <div>
            <TextareaField id="learningObjectives" label="Tujuan Pembelajaran" value={formData.learningObjectives} onChange={handleChange} rows={3} />
            {errors.learningObjectives && <p className="text-red-500 text-sm mt-1">{errors.learningObjectives}</p>}
          </div>

          <div>
            <TextareaField id="subjectMatter" label="Materi Pelajaran" value={formData.subjectMatter} onChange={handleChange} rows={2} />
            {errors.subjectMatter && <p className="text-red-500 text-sm mt-1">{errors.subjectMatter}</p>}
          </div>

          <div>
            <TextareaField 
              id="studentTarget" 
              label="Target / Karakteristik Siswa (Opsional)" 
              value={formData.studentTarget || ''} 
              onChange={handleChange} 
              required={false}
              rows={2}
              placeholder="Contoh: Siswa kelas IX yang aktif, terbiasa dengan metode belajar kelompok, dan memiliki latar belakang minat visual..."
              helperText="Biarkan kosong jika ingin AI secara otomatis mendeskripsikan karakteristik umum siswa berdasarkan jenjang kelas."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Opsi Integrasi Tambahan</label>
            <div className="space-y-2 rounded-lg bg-white p-3 border border-slate-200">
              {Object.values(IntegrationOption).map(option => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="integrationOption"
                    value={option}
                    checked={formData.integrationOption === option}
                    onChange={handleChange}
                    className="h-4 w-4 text-cyan-600 border-slate-300 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Dimensi Lulusan (Pilih beberapa)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 bg-white p-3 rounded-lg border border-slate-200">
              {GRADUATE_DIMENSIONS.map(dim => (
                <label key={dim} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-50">
                  <input 
                    type="checkbox"
                    checked={formData.graduateDimensions.includes(dim)}
                    onChange={() => handleDimensionChange(dim)}
                    className="h-4 w-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-600">{dim}</span>
                </label>
              ))}
            </div>
            {errors.graduateDimensions && <p className="text-red-500 text-sm mt-2">{errors.graduateDimensions}</p>}
          </div>

        </div>
      </div>

      {/* Tombol Aksi Utama */}
      <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-1/2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center text-base"
        >
          {isLoading ? 'Memproses...' : 'Generate RPM'}
        </button>
        <button
          type="button"
          onClick={handleFillExample}
          disabled={isLoading}
          className="w-full sm:w-1/2 bg-white text-slate-700 font-bold py-3.5 px-6 rounded-xl border-2 border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-200 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          Isi Contoh
        </button>
      </div>
    </form>
  );
};