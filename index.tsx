
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Users, 
  Calendar, 
  Download, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Search,
  UserPlus,
  Trash2,
  X,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- 类型定义 ---
type AttendanceStatus = 'present' | 'absent' | 'leave';
type UserRole = 'teacher' | 'admin';

interface Student {
  id: string;
  name: string;
  avatar: string;
}

interface AttendanceRecord {
  date: string;
  studentId: string;
  status: AttendanceStatus;
}

// --- 初始数据 ---
const INITIAL_STUDENTS: Student[] = [
  '张小明', '李华', '王芳', '赵磊', '孙悦', 
  '周杰', '吴敏', '郑亮', '冯婷', '陈冠',
  '褚倩', '卫东', '蒋雯', '沈超', '韩梅',
  '杨睿', '朱珠', '秦朗', '尤娜', '许博'
].map((name, i) => ({
  id: `s-${i + 1}`,
  name,
  avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`
}));

const App = () => {
  // 状态管理
  const [user, setUser] = useState<{ role: UserRole } | null>(null);
  const [loginMode, setLoginMode] = useState<UserRole | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('kindergarten_students_v2');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendance_data_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // 数据持久化
  useEffect(() => {
    localStorage.setItem('kindergarten_students_v2', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('attendance_data_v2', JSON.stringify(attendance));
  }, [attendance]);

  // 统计逻辑
  const stats = useMemo(() => {
    const dayRecords = attendance.filter(a => a.date === currentDate);
    return {
      present: dayRecords.filter(a => a.status === 'present').length,
      absent: dayRecords.filter(a => a.status === 'absent').length,
      leave: dayRecords.filter(a => a.status === 'leave').length,
      total: students.length,
      unrecorded: students.length - dayRecords.length
    };
  }, [attendance, currentDate, students]);

  // 核心操作
  const toggleStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.date === currentDate && a.studentId === studentId));
      const currentEntry = prev.find(a => a.date === currentDate && a.studentId === studentId);
      
      if (currentEntry?.status === status) return filtered;
      return [...filtered, { date: currentDate, studentId, status }];
    });
  };

  const getStatus = (studentId: string) => {
    return attendance.find(a => a.date === currentDate && a.studentId === studentId)?.status;
  };

  const handleLogin = () => {
    if (loginMode === 'admin' && password === '888') {
      setUser({ role: 'admin' });
      setLoginError('');
    } else if (loginMode === 'teacher' && password === '666') {
      setUser({ role: 'teacher' });
      setLoginError('');
    } else {
      setLoginError('密码错误，请重试');
    }
  };

  const exportToExcel = () => {
    const headers = ['日期', '姓名', '出勤状态'];
    const rows = attendance.map(a => {
      const student = students.find(s => s.id === a.studentId);
      const statusMap = { present: '出勤', absent: '缺勤', leave: '请假' };
      return [a.date, student?.name || '未知学生', statusMap[a.status]];
    });
    
    // 增加 BOM 解决 Excel 中文乱码
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `考勤报表_${currentDate}.csv`;
    link.click();
  };

  const generateAiInsight = async () => {
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        角色：资深幼儿园园长
        数据：日期${currentDate}，总人数${stats.total}，实到${stats.present}，缺勤${stats.absent}，请假${stats.leave}。
        任务：根据这个考勤情况，给当值老师写一段简短的鼓励话语，并对缺勤情况给出温馨建议（300字以内）。
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || '分析完成，请继续加油！');
    } catch (error) {
      setAiInsight('AI 助手忙碌中，请先手动处理考勤。');
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredStudents = students.filter(s => s.name.includes(searchTerm));

  // --- 渲染：登录界面 ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF]">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl border border-white space-y-8">
          {!loginMode ? (
            <>
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-4xl font-black text-gray-800 tracking-tight">心芽考勤</h1>
                <p className="text-gray-500 mt-2 font-medium">陪伴每一个小树苗茁壮成长</p>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <button onClick={() => setLoginMode('teacher')} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white border-2 border-transparent hover:border-blue-200 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Users className="w-8 h-8" /></div>
                    <div className="text-left">
                      <div className="font-bold text-xl text-gray-800">教师入口</div>
                      <div className="text-sm text-gray-400">每日打卡记录</div>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setLoginMode('admin')} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white border-2 border-transparent hover:border-purple-200 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-600"><ShieldCheck className="w-8 h-8" /></div>
                    <div className="text-left">
                      <div className="font-bold text-xl text-gray-800">管理中心</div>
                      <div className="text-sm text-gray-400">报表导出与修改</div>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <button onClick={() => {setLoginMode(null); setPassword(''); setLoginError('');}} className="flex items-center gap-2 text-gray-400 font-bold">
                <ArrowLeft className="w-5 h-5" /> 返回选择
              </button>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-800">{loginMode === 'admin' ? '管理员登录' : '教师登录'}</h2>
                <p className="text-gray-400 mt-2">请输入您的访问密码</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码" 
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all text-lg font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
                <p className="text-xs text-center text-gray-400">演示密码：教师 666 | 管理员 888</p>
                <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 active:scale-95 transition-all">
                  立即进入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 渲染：主界面 ---
  return (
    <div className="max-w-4xl mx-auto px-5 py-10 pb-40">
      {/* 添加学生弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-800">添加新成员</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="space-y-6">
              <input 
                autoFocus 
                type="text" 
                value={newStudentName} 
                onChange={(e) => setNewStudentName(e.target.value)} 
                placeholder="小朋友姓名" 
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 focus:border-blue-500 outline-none transition-all text-xl" 
              />
              <button 
                onClick={() => {
                  if(!newStudentName.trim()) return;
                  const newKid: Student = {
                    id: `s-${Date.now()}`,
                    name: newStudentName.trim(),
                    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${newStudentName}`
                  };
                  setStudents([...students, newKid]);
                  setNewStudentName('');
                  setShowAddModal(false);
                }} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-100"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 头部导航 */}
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
            {user.role === 'admin' ? <ShieldCheck className="w-8 h-8" /> : <Users className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">{user.role === 'admin' ? '园所管理中心' : '班级考勤台'}</h2>
            <div className="flex items-center gap-2 text-blue-500 font-bold mt-1">
              <Calendar className="w-4 h-4" />
              <input 
                type="date" 
                value={currentDate} 
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent border-none outline-none text-sm cursor-pointer"
              />
            </div>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"><LogOut className="w-6 h-6" /></button>
      </header>

      {/* 快捷统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: '出勤', val: stats.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '缺勤', val: stats.absent, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: '请假', val: stats.leave, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '待记', val: stats.unrecorded, color: 'text-gray-400', bg: 'bg-gray-50' }
        ].map((item, idx) => (
          <div key={idx} className={`${item.bg} p-5 rounded-[2rem] text-center border-2 border-white shadow-sm transition-transform hover:scale-105`}>
            <div className={`text-3xl font-black ${item.color}`}>{item.val}</div>
            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* AI 寄语区域 */}
      <div className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] mb-10 border border-white shadow-xl relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <h3 className="text-lg font-black tracking-tight">AI 园长分析</h3>
          </div>
          <button 
            onClick={generateAiInsight} 
            disabled={isAiLoading} 
            className="text-xs font-black bg-blue-100 text-blue-600 py-2 px-4 rounded-full disabled:opacity-50 active:scale-95 transition-all"
          >
            {isAiLoading ? '分析中...' : '重新分析'}
          </button>
        </div>
        <p className="text-gray-600 leading-relaxed font-medium">
          {aiInsight || '点击按钮，让 AI 结合今日考勤数据为您生成专属教学建议...'}
        </p>
      </div>

      {/* 操作工具栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          <input 
            type="text" 
            placeholder="搜一搜小朋友的名字..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white border-2 border-transparent focus:border-blue-400 rounded-3xl py-4 pl-14 pr-6 outline-none shadow-sm transition-all text-lg font-medium" 
          />
        </div>
        {user.role === 'admin' && (
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black shadow-lg shadow-blue-200 active:scale-95 transition-all">
              <UserPlus className="w-5 h-5" /> 增加学生
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-[1.5rem] font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all">
              <Download className="w-5 h-5" /> 导出
            </button>
          </div>
        )}
      </div>

      {/* 学生列表 */}
      <div className="space-y-4">
        {filteredStudents.length > 0 ? filteredStudents.map(student => {
          const status = getStatus(student.id);
          return (
            <div key={student.id} className="bg-white/80 p-5 rounded-[2rem] flex items-center justify-between group hover:shadow-lg transition-all border border-transparent hover:border-white">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img src={student.avatar} alt={student.name} className="w-16 h-16 rounded-[1.2rem] bg-gray-50 border-2 border-white shadow-sm" />
                  {status && (
                    <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-md ${
                      status === 'present' ? 'bg-emerald-500' : status === 'absent' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}>
                      {status === 'present' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <XCircle className="w-3 h-3 text-white" />}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-gray-800 text-xl">{student.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {student.id.split('-').pop()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleStatus(student.id, 'present')} 
                  title="出勤"
                  className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all ${status === 'present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-300 hover:bg-emerald-50 hover:text-emerald-500'}`}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </button>
                <button 
                  onClick={() => toggleStatus(student.id, 'absent')} 
                  title="缺勤"
                  className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all ${status === 'absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-100 text-gray-300 hover:bg-rose-50 hover:text-rose-500'}`}
                >
                  <XCircle className="w-7 h-7" />
                </button>
                <button 
                  onClick={() => toggleStatus(student.id, 'leave')} 
                  title="请假"
                  className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all ${status === 'leave' ? 'bg-amber-500 text-white shadow-lg' : 'bg-gray-100 text-gray-300 hover:bg-amber-50 hover:text-amber-500'}`}
                >
                  <Clock className="w-7 h-7" />
                </button>
                {user.role === 'admin' && (
                  <button 
                    onClick={() => {
                      if(confirm('确定要移除这位小朋友及其历史记录吗？')) {
                        setStudents(students.filter(s => s.id !== student.id));
                        setAttendance(attendance.filter(a => a.studentId !== student.id));
                      }
                    }} 
                    className="w-12 h-12 rounded-[1rem] flex items-center justify-center bg-gray-50 text-gray-300 hover:bg-red-500 hover:text-white transition-all ml-2"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-white/40 rounded-[3rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">没有找到匹配的小朋友喔～</p>
          </div>
        )}
      </div>

      {/* 底部悬浮条 */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-[50]">
        <div className="max-w-lg mx-auto bg-white/90 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-[3rem] p-6 flex items-center justify-between border border-white">
          <div className="flex flex-col pl-4">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">记录进度</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-blue-600">
                {attendance.filter(a => a.date === currentDate).length}
              </span>
              <span className="text-gray-300 text-lg font-bold">/ {students.length}</span>
            </div>
          </div>
          <button 
            disabled={attendance.filter(a => a.date === currentDate).length === 0}
            onClick={() => alert(`✨ 已成功同步 ${currentDate} 的所有考勤数据！`)}
            className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-blue-200 active:scale-95 disabled:grayscale disabled:opacity-30 transition-all"
          >
            保存并提交
          </button>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
