/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'classroom.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface ClassroomData {
  studentName: string;
  lessonTitle: string;
  // تقييم الطالب في الحصة
  evaluation: {
    grade: string;
    score: number; // out of 10
    notes: string;
  };
  // الملف الصوتي الذي ينزله المعلم ليستمع إليه الطالب
  teacherAudio: {
    audioUrl: string;
    title: string;
    updatedAt: string;
  };
  // الواجب الصوتي الذي سيبعته المعلم للطالب ليسجله بصوته
  homework: {
    title: string;
    instructions: string;
    dueDate: string;
    status: 'لم يسلم بعد' | 'تم تسليم التسجيل الصوتي';
  };
  // تسجيل الطالب الذي سيسجله كواجب للمعلم
  studentAudio: {
    audioUrl: string;
    submittedAt: string;
    studentNote: string;
  };
}

const DEFAULT_DATA: ClassroomData = {
  studentName: 'عبد الرحمن أحمد',
  lessonTitle: 'حصة التجويد والتلاوة',
  evaluation: {
    grade: 'ممتاز',
    score: 9.5,
    notes: 'ما شاء الله تبارك الله، قراءة ممتازة وأداء متقن في الحصة. انتبه فقط لزمن المد عند الوقف.',
  },
  teacherAudio: {
    audioUrl: '',
    title: 'توجيه المعلم والتلاوة النموذجية',
    updatedAt: new Date().toISOString(),
  },
  homework: {
    title: 'واجب تسجيل صوتي: سورة الفاتحة والآيات المقررة',
    instructions: 'عزيزي الطالب، استمع للملف الصوتي المرفق من المعلم أولاً، ثم افتح المايكروفون وسجل بصوتك قراءة السورة مع مراعاة أحكام التجويد والهدوء، ثم اضغط على زر إرسال الواجب للمعلم.',
    dueDate: '2026-11-03',
    status: 'لم يسلم بعد',
  },
  studentAudio: {
    audioUrl: '',
    submittedAt: '',
    studentNote: '',
  },
};

function readData(): ClassroomData {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('Error reading classroom.json, using default:', e);
    }
  }
  return DEFAULT_DATA;
}

function writeData(data: ClassroomData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing classroom.json:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Support audio files in base64 up to 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API to get current synced data
  app.get('/api/classroom', (_req: Request, res: Response) => {
    res.json({ success: true, data: readData() });
  });

  // API to update data (from teacher or student)
  app.post('/api/classroom', (req: Request, res: Response) => {
    const updated = req.body;
    if (updated && typeof updated === 'object') {
      writeData(updated);
      res.json({ success: true, data: updated });
    } else {
      res.status(400).json({ success: false, error: 'Invalid data' });
    }
  });

  // API to reset
  app.post('/api/reset', (_req: Request, res: Response) => {
    writeData(DEFAULT_DATA);
    res.json({ success: true, data: DEFAULT_DATA });
  });

  // Serve Frontend
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
