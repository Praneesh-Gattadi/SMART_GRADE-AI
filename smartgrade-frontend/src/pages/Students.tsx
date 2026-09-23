import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Trash2, Edit, Mail, BookOpen, UserCheck, X, FolderOpen,
  FolderPlus, Grid, Award, TrendingUp, CheckCircle, FileSpreadsheet,
  Calendar, Hash, AlertCircle, Sparkles, Download
} from 'lucide-react';
import { studentAPI } from '@/api/endpoints';
import { Student } from '@/api/types';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// Mock historical scores for Student Drawer Dashboard
const MOCK_HISTORY = [
  { exam: 'Unit 1', score: 82 },
  { exam: 'Unit 2', score: 78 },
  { exam: 'Mid-term', score: 88 },
  { exam: 'Unit 3', score: 92 },
  { exam: 'Finals', score: 90 },
];

export const Students: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Grouping / Filter state
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Selections (Bulk Actions)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals / Drawer Controller
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

  // Form States
  const [newSectionName, setNewSectionName] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    class_section: ''
  });

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const data = await studentAPI.getAll();
      setStudents(data.students);

      const derived = Array.from(new Set(data.students.map((s: Student) => s.class_section).filter(Boolean))) as string[];
      const saved = JSON.parse(localStorage.getItem('smart_custom_sections') || '[]');
      const merged = Array.from(new Set([...derived, ...saved]));
      setSections(merged);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    if (sections.includes(newSectionName.trim())) {
      toast.error('Section already exists!');
      return;
    }

    const updated = [...sections, newSectionName.trim()];
    setSections(updated);

    const saved = JSON.parse(localStorage.getItem('smart_custom_sections') || '[]');
    localStorage.setItem('smart_custom_sections', JSON.stringify([...saved, newSectionName.trim()]));

    toast.success(`Section '${newSectionName}' added!`);
    setNewSectionName('');
    setIsAddSectionOpen(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentAPI.create(formData);
      toast.success('Student added successfully!');
      setIsAddOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      await studentAPI.update(activeStudent.id, formData);
      toast.success('Student updated successfully!');
      setIsEditOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      await studentAPI.delete(id);
      toast.success('Student removed from list.');
      if (drawerStudent?.id === id) setIsDrawerOpen(false);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student.');
    }
  };

  const handleSendAlert = async (id: number) => {
    try {
      await studentAPI.sendAlert(id);
      toast.success('Alert trigger sent to Student Dashboard.');
    } catch (error) {
      toast.error('Failed to send alert.');
    }
  };

  const openEditModal = (student: Student) => {
    setActiveStudent(student);
    setFormData({
      full_name: student.full_name,
      roll_number: student.roll_number,
      email: student.email || '',
      class_section: student.class_section || ''
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({ full_name: '', roll_number: '', email: '', class_section: selectedSection || '' });
    setActiveStudent(null);
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Full Name,Roll Number,Email,Class Section\n"
      + "Alex Carter,2026CSE001,alex@college.edu,CSE-A\n"
      + "Priya Sharma,2026CSE002,priya@college.edu,CSE-A\n"
      + "Rahul Verma,2026ECE015,rahul@college.edu,ECE-B\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample CSV template downloaded!");
  };

  // Robust CSV Bulk Import Handler
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers change event
    e.target.value = '';

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      toast.error(
        "Excel (.xlsx) files cannot be read directly as text. Please save your file as CSV (.csv) or use our sample template.",
        { duration: 6000 }
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      let content = event.target?.result as string;

      if (!content || typeof content !== 'string') {
        toast.error("Could not read file content.");
        return;
      }

      // Check for binary signature or invalid non-printable characters
      if (content.startsWith('PK\x03\x04') || /[\x00-\x08\x0E-\x1F]/.test(content.slice(0, 100))) {
        toast.error("The selected file is a binary file (e.g. XLSX/Zip), not plain text CSV. Please export as CSV (.csv).", { duration: 6000 });
        return;
      }

      // Strip UTF-8 BOM
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }

      const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (rawLines.length === 0) {
        toast.error("CSV file is empty.");
        return;
      }

      // Parse CSV line with quote awareness
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const firstLineTokens = parseCsvLine(rawLines[0]).map(t => t.toLowerCase());

      // Header column index matching
      let nameIdx = -1;
      let rollIdx = -1;
      let emailIdx = -1;
      let sectionIdx = -1;
      let hasHeader = false;

      firstLineTokens.forEach((token, idx) => {
        if (token.includes('name') || token.includes('student')) { nameIdx = idx; hasHeader = true; }
        else if (token.includes('roll') || token.includes('id') || token.includes('reg')) { rollIdx = idx; hasHeader = true; }
        else if (token.includes('email') || token.includes('mail')) { emailIdx = idx; hasHeader = true; }
        else if (token.includes('sec') || token.includes('class') || token.includes('branch')) { sectionIdx = idx; hasHeader = true; }
      });

      if (!hasHeader) {
        nameIdx = 0;
        rollIdx = 1;
        emailIdx = 2;
        sectionIdx = 3;
      }

      const dataLines = hasHeader ? rawLines.slice(1) : rawLines;
      if (dataLines.length === 0) {
        toast.error("No student records found in CSV file.");
        return;
      }

      toast.loading(`Importing ${dataLines.length} students...`, { id: 'csv-loading' });

      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        const cols = parseCsvLine(line);
        const name = nameIdx >= 0 && nameIdx < cols.length ? cols[nameIdx] : cols[0];
        const roll = rollIdx >= 0 && rollIdx < cols.length ? cols[rollIdx] : cols[1];
        const email = emailIdx >= 0 && emailIdx < cols.length ? cols[emailIdx] : cols[2];
        const sec = sectionIdx >= 0 && sectionIdx < cols.length ? cols[sectionIdx] : cols[3];

        // Sanitize strings
        const cleanName = (name || '').replace(/[^\w\s.-]/gi, ' ').trim();
        const cleanRoll = (roll || '').replace(/[^\w\s.-]/gi, ' ').trim();

        if (!cleanName || !cleanRoll || cleanName.length < 2) {
          errorCount++;
          continue;
        }

        try {
          await studentAPI.create({
            full_name: cleanName,
            roll_number: cleanRoll,
            email: email && email.includes('@') ? email.trim() : undefined,
            class_section: sec ? sec.trim() : (selectedSection || undefined)
          });
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }

      toast.dismiss('csv-loading');
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} students! ${errorCount > 0 ? `(${errorCount} skipped)` : ''}`);
      } else {
        toast.error("Failed to import students. Please check your CSV format or download our template.");
      }
      fetchStudents();
    };

    reader.readAsText(file);
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} students?`)) return;
    try {
      await Promise.all(selectedIds.map(id => studentAPI.delete(id)));
      toast.success(`Batch deletion of ${selectedIds.length} students complete!`);
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      toast.error("Failed some bulk deletions.");
    }
  };

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = !selectedSection || student.class_section === selectedSection;
    return matchesSearch && matchesSection;
  });

  // Analytics Computation (only over students who have actually been evaluated)
  const activeSectionStudents = selectedSection
    ? students.filter(s => s.class_section === selectedSection)
    : students;

  const evaluatedStudents = activeSectionStudents.filter(
    s => (s.evaluation_count && s.evaluation_count > 0) || (s.average_score !== undefined && s.average_score !== null && s.average_score > 0)
  );

  const avgScore = evaluatedStudents.length
    ? Math.round(evaluatedStudents.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / evaluatedStudents.length)
    : 0;

  const passingRate = evaluatedStudents.length
    ? Math.round((evaluatedStudents.filter(s => (s.average_score || 0) >= 40).length / evaluatedStudents.length) * 100)
    : 0;

  const highestScore = evaluatedStudents.length
    ? Math.max(...evaluatedStudents.map(s => s.average_score || 0))
    : 0;

  const getGradeColor = (avg: number) => {
    if (avg >= 85) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (avg >= 70) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    if (avg >= 40) return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
  };

  return (
    <div className="min-h-screen bg-background p-8 relative flex flex-col overflow-hidden animate-in fade-in duration-700">


      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
            <UserCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Students</h1>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Manage sections and track student datasets.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            onClick={handleDownloadSampleCsv} 
            variant="outline" 
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl h-11 px-3.5 text-xs shadow-xs"
            title="Download formatted sample CSV file"
          >
            <Download className="w-4 h-4 mr-1.5 text-primary" />
            Sample CSV
          </Button>
          <div className="relative">
            <input type="file" accept=".csv" onChange={handleCsvImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <Button variant="outline" className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl h-11 px-4 text-xs shadow-xs">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
              Bulk CSV Import
            </Button>
          </div>
          <Button onClick={() => setIsAddSectionOpen(true)} variant="outline" className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl h-11 px-4 text-xs shadow-xs">
            <FolderPlus className="w-4 h-4 mr-2 text-primary" />
            Add Section
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-5 text-xs shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Student
          </Button>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

        {/* Left column: Section Folders */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Grid className="w-3.5 h-3.5" /> Class Sections
            </h3>
          </div>

          <div className="space-y-2">
            <Card
              onClick={() => setSelectedSection(null)}
              className={`p-3.5 cursor-pointer border transition-all flex items-center justify-between rounded-2xl select-none ${selectedSection === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700 shadow-xs'
                }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className={`w-4 h-4 ${selectedSection === null ? 'text-primary-foreground' : 'text-primary'}`} />
                <span className={`font-bold text-xs ${selectedSection === null ? 'text-primary-foreground' : 'text-slate-800'}`}>All Students</span>
              </div>
              <div className={`text-xs font-black px-2.5 py-0.5 rounded-full ${selectedSection === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{students.length}</div>
            </Card>

            {sections.map((section, idx) => {
              const count = students.filter(s => s.class_section === section).length;
              const isSelected = selectedSection === section;
              return (
                <Card
                  key={idx}
                  onClick={() => setSelectedSection(section)}
                  className={`p-3.5 cursor-pointer border transition-all flex items-center justify-between rounded-2xl select-none ${isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700 shadow-xs'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className={`font-bold text-xs ${isSelected ? 'text-primary-foreground' : 'text-slate-800'}`}>{section}</span>
                  </div>
                  <div className={`text-xs font-black px-2.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>{count}</div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right column: Analytics + Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col h-full">

          {/* AI Insight Banner */}
          <Card className="bg-indigo-50/80 border border-indigo-100 shadow-xs p-4 rounded-2xl flex items-start gap-3.5 animate-in slide-in-from-top-3 duration-500">
            <div className="p-2 bg-primary/10 rounded-xl flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-primary font-extrabold text-xs mb-0.5">AI Classroom Assistant</h4>
              <p className="text-slate-700 text-xs leading-relaxed font-medium">
                Currently viewing <strong className="text-slate-900 font-bold">{selectedSection || 'All Students'}</strong>.
                The passing rate is sitting at <strong className="text-slate-900 font-bold">{passingRate}%</strong>.
                {passingRate < 60 ? 'Consider holding a review recap for underperforming topics.' : 'Performance looks healthy; ready to push targets.'}
              </p>
            </div>
          </Card>

          {/* Top Analytical Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition-all">
              <div>
                <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Class Average</p>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{avgScore}%</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition-all">
              <div>
                <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Passing Rate</p>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{passingRate}%</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition-all">
              <div>
                <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Highest Scorer</p>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{highestScore > 0 ? `${highestScore}%` : '—'}</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
            </Card>
          </div>

          {/* Search bar & Bulk Action Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder={`Search in ${selectedSection || 'All Students'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-transparent border-none text-slate-900 placeholder:text-slate-400 font-medium h-11 focus-visible:ring-0"
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right-5 duration-200">
                <span className="text-xs font-bold text-rose-700">{selectedIds.length} Selected</span>
                <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="rounded-xl h-8 px-3 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white">Delete</Button>
              </div>
            )}
          </div>

          {/* Table container */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden flex-1 relative">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in duration-500 h-full flex-1">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3.5 shadow-xs">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-wide">No Students Listed</h3>
                <p className="text-slate-500 text-xs max-w-xs mt-1 mb-4 leading-relaxed font-medium">
                  {selectedSection
                    ? `There are currently no students registered inside the ${selectedSection} section.`
                    : "Get started by importing datasets or adding your first student manually."}
                </p>
                {!selectedSection && (
                  <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 font-bold rounded-xl text-xs h-10 px-4 shadow-md shadow-primary/20 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1.5" /> Add Student
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 bg-white text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Roll #</th>
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Exams</th>
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Avg Score</th>
                      <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => { setDrawerStudent(student); setIsDrawerOpen(true); }}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(student.id)}
                            onChange={() => toggleSelect(student.id)}
                            className="rounded border-slate-300 bg-white text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {student.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-slate-900 font-semibold block">{student.full_name}</span>
                              <span className="text-slate-500 text-xs">{student.email || 'No email synced'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{student.roll_number}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <div className="bg-slate-100 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center mx-auto border border-slate-200 font-semibold">
                            {student.evaluation_count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getGradeColor(student.average_score || 0)}`}>
                            {student.average_score ? `${student.average_score}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(student)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 w-8 h-8 p-0"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleSendAlert(student.id)} className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 w-8 h-8 p-0"><Mail className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(student.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-8 h-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* --- SIDE DRAWER: Student Detail Dashboard --- */}
      {isDrawerOpen && drawerStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
          <Card className="w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl h-full relative z-10 animate-in slide-in-from-right duration-300 overflow-y-auto no-scrollbar flex flex-col rounded-none">

            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(false)} className="rounded-full w-8 h-8 p-0"><X className="w-4 h-4" /></Button>
              <div className="flex gap-2">
                <Button onClick={() => openEditModal(drawerStudent)} size="sm" className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg h-8 hover:bg-slate-200"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                <Button onClick={() => handleDeleteStudent(drawerStudent.id)} size="sm" variant="destructive" className="rounded-lg h-8 text-white"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Profile Header */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-md">
                  {drawerStudent.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{drawerStudent.full_name}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Hash className="w-3.5 h-3.5" /> Roll: {drawerStudent.roll_number}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Calendar className="w-3.5 h-3.5" /> Sector: {drawerStudent.class_section || 'Unassigned'}</p>
                </div>
              </div>

              {/* Quick metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <span className="text-xs font-semibold text-slate-500">Aggregate</span>
                  <h3 className={`text-2xl font-black mt-1 ${getGradeColor(drawerStudent.average_score || 0).split(' ')[2]}`}>
                    {drawerStudent.average_score ? `${drawerStudent.average_score}%` : '—'}
                  </h3>
                </Card>
                <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <span className="text-xs font-semibold text-slate-500">Exams Taken</span>
                  <h3 className="text-2xl font-black mt-1 text-slate-900">{drawerStudent.evaluation_count || 0}</h3>
                </Card>
              </div>

              {/* Historical Graph using Recharts */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Performance Trend</h4>
                <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={MOCK_HISTORY}>
                      <XAxis dataKey="exam" stroke="#64748b" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} width={25} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a' }} />
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ stroke: '#6366f1', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* AI Strength/Weakness Insights */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium">Consistent Submissions</span>
                    <span className="px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium">Concept Accuracy</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Growth Areas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-md bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs font-medium">Exam Speed Management</span>
                  </div>
                </div>
              </div>
            </div>

          </Card>
        </div>
      )}

      {/* Modal: Add Section */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAddSectionOpen(false)} />
          <Card className="bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-200">
            <Button variant="ghost" size="sm" onClick={() => setIsAddSectionOpen(false)} className="absolute top-4 right-4 rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></Button>
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderPlus className="w-4 h-4 text-primary" />
              </div>
              Create Section / Branch
            </h2>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block mb-1">Section / Branch Name</Label>
                <Input
                  required
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  placeholder="e.g. CSE-A, ECE-B, Sec-1, Batch 2026"
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-md shadow-primary/20">Add Section</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Add/Edit Student */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }} />
          <Card className="bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200">
            <Button variant="ghost" size="sm" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }} className="absolute top-4 right-4 rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></Button>
            <h2 className="text-lg font-black text-slate-900 mb-5">{isAddOpen ? 'Add New Student' : 'Edit Student Details'}</h2>

            <form onSubmit={isAddOpen ? handleAddStudent : handleEditStudent} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block mb-1">Full Name</Label>
                <Input name="full_name" required value={formData.full_name} onChange={handleInputChange} placeholder="e.g. Alex Carter" className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block mb-1">Roll / Registration Number</Label>
                <Input name="roll_number" required value={formData.roll_number} onChange={handleInputChange} placeholder="e.g. 2026CSE042" className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block mb-1">Email Address</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="e.g. alex@college.edu" className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 block mb-1">Class Section / Branch</Label>
                <Select value={formData.class_section} onValueChange={(val) => setFormData({ ...formData, class_section: val })}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary">
                    <SelectValue placeholder="Select Section / Branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-xl">
                    {sections.map((s, idx) => (
                      <SelectItem key={idx} value={s} className="hover:bg-slate-50 cursor-pointer text-xs font-semibold">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }} className="flex-1 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl h-11">Cancel</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 shadow-md shadow-primary/20">{isAddOpen ? 'Register Student' : 'Save Changes'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Students;
