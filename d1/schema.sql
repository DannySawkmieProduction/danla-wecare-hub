-- Cloudflare D1 schema for DanLa WeCare Hub
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS institution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  short_name TEXT,
  logo_url TEXT,
  seal_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  pin_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  principal_name TEXT,
  principal_designation TEXT,
  institution_code TEXT,
  affiliation TEXT,
  accreditation TEXT,
  academic_year TEXT,
  current_semester TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS administrators (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  email TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT,
  department_id TEXT,
  created_at INTEGER,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT,
  department_id TEXT,
  created_at INTEGER,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faculty (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  department_id TEXT,
  created_at INTEGER,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  class_id TEXT,
  department_id TEXT,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  subject_id TEXT,
  faculty_id TEXT,
  day TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  date TEXT,
  class_id TEXT,
  student_id TEXT,
  status TEXT,
  remark TEXT,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT,
  class_id TEXT,
  subject_id TEXT,
  faculty_id TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS marks (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  exam_id TEXT,
  marks_obtained REAL,
  grade TEXT,
  created_at INTEGER,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  type TEXT,
  title TEXT,
  description TEXT,
  class_id TEXT,
  subject_id TEXT,
  faculty_id TEXT,
  due_date TEXT,
  max_marks REAL,
  status TEXT,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  type TEXT,
  topic TEXT,
  description TEXT,
  link TEXT,
  file_name TEXT,
  class_id TEXT,
  subject_id TEXT,
  faculty_id TEXT,
  department_id TEXT,
  published_date TEXT,
  status TEXT,
  downloads INTEGER DEFAULT 0,
  created_at INTEGER,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  audience TEXT,
  department_id TEXT,
  priority TEXT,
  description TEXT,
  attachment TEXT,
  publish_date TEXT,
  expiry_date TEXT,
  status TEXT,
  pinned INTEGER DEFAULT 0,
  created_at INTEGER,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports_meta (
  id TEXT PRIMARY KEY,
  type TEXT,
  params TEXT,
  generated_at INTEGER
);

-- key/value store to mirror legacy localStorage keys for smooth migration
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
