
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, Maximize, X, Menu, Loader2,
  Play, Pause, SkipBack, SkipForward, Music,
  ChevronDown, ChevronRight as ChevronRightIcon, FileText, FolderOpen, Book as BookIcon
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

interface BookReaderProps {
  book: Book;
}

const PDF_VERSION = '4.4.168';
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
};

const BookReader: React.FC<BookReaderProps> = ({ book }) => {
  // --- LOGIC XỬ LÝ CÂY MENU ---
  const treeData = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];
    
    book.chapters.forEach(ch => {
      map[ch.id] = { ...ch, children: [] };
    });

    book.chapters.forEach(ch => {
      if (ch.parentId && map[ch.parentId]) {
