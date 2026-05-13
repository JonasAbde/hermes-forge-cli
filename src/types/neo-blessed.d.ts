/**
 * Type declarations for neo-blessed
 */
declare module 'neo-blessed' {
  import { EventEmitter } from 'events';

  export interface ScreenOptions {
    smartCSR?: boolean;
    title?: string;
    dockBorders?: boolean;
    fullUnicode?: boolean;
    autoPadding?: boolean;
    log?: string;
    warnings?: boolean;
  }

  export interface ElementOptions {
    parent?: any;
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
    width?: number | string;
    height?: number | string;
    shrink?: boolean;
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    style?: any;
    border?: any | string;
    content?: string;
    tags?: boolean;
    label?: string;
    align?: string;
    valign?: string;
    hidden?: boolean;
    scrollable?: boolean;
    alwaysScroll?: boolean;
    scrollbar?: any;
    keys?: boolean;
    vi?: boolean;
    mouse?: boolean;
    focusable?: boolean;
    clickable?: boolean;
    input?: boolean;
  }

  export interface ListOptions extends ElementOptions {
    items?: string[];
    itemHeight?: number;
    interactive?: boolean;
    invertSelected?: boolean;
  }

  export interface LogOptions extends ElementOptions {
    scrollback?: number;
    scrollOnInput?: boolean;
  }

  export interface ListbarOptions extends ElementOptions {
    items?: Array<{ text: string; callback: () => void; key?: string }>;
    autoCommandKeys?: boolean;
    commands?: any;
  }

  export interface TextOptions extends ElementOptions {
    fill?: boolean;
    align?: string;
  }

  export class Screen extends EventEmitter {
    constructor(options?: ScreenOptions);
    append(element: any): void;
    render(): void;
    destroy(): void;
    key(keys: string[] | string, listener: (ch: any, key: any) => void): void;
    cursor: { reset(): void };
    program: any;
    title: string;
    focus(): void;
  }

  export class Element extends EventEmitter {
    constructor(options?: ElementOptions);
    setContent(content: string): void;
    getContent(): string;
    setLabel(label: string): void;
    focus(): void;
    hide(): void;
    show(): void;
    destroy(): void;
    setIndex(index: number): void;
    setItems(items: string[]): void;
    insertItem(index: number, item: string): void;
    getItem(item: string): any;
    removeItem(item: string): void;
    addItem(item: string): void;
    clearItems(): void;
    scroll(offset: number): void;
    setScroll(offset: number): void;
    getScroll(): number;
    setScrollPercent(percent: number): void;
    getScrollPercent(): number;
    on(event: string, callback: (...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    width: number;
    height: number;
    left: number;
    top: number;
    parent: any;
    children: any[];
    screen: Screen;
    style: any;
    border: any;
    position: any;
  }

  export class Box extends Element {
    constructor(options?: ElementOptions);
  }

  export class List extends Element {
    constructor(options?: ListOptions);
    items: any[];
    selected: number;
    select(index: number): void;
    moveUp(amount?: number): void;
    moveDown(amount?: number): void;
    setItems(items: string[]): void;
    insertItem(index: number, item: any): void;
    getItem(item: string): any;
    setIndex(index: number): void;
    removeItem(item: string): void;
    addItem(item: any): void;
    clearItems(): void;
    on(event: 'select' | 'cancel' | 'action', callback: (item: any, index: number) => void): this;
  }

  export class Log extends Element {
    constructor(options?: LogOptions);
    log(text: string): void;
    add(text: string): void;
    setContent(content: string): void;
    scrollback: number;
  }

  export class Text extends Element {
    constructor(options?: TextOptions);
  }

  export class Listbar extends Element {
    constructor(options?: ListbarOptions);
    setItems(commands: any[]): void;
    selectTab(index: number): void;
    moveLeft(): void;
    moveRight(): void;
  }

  export class ScrollableBox extends Element {
    constructor(options?: ElementOptions);
  }

  export const widget: {
    Screen: typeof Screen;
    Box: typeof Box;
    List: typeof List;
    Log: typeof Log;
    Text: typeof Text;
    Line: typeof Element;
    Listbar: typeof Listbar;
    ScrollableBox: typeof ScrollableBox;
    Element: typeof Element;
  };

  export const Screen: typeof Screen;
  export const Box: typeof Box;
  export const List: typeof List;
  export const Log: typeof Log;
  export const Text: typeof Text;
  export const Listbar: typeof Listbar;

  export interface BlessedNamespace {
    Screen: typeof Screen;
    Box: typeof Box;
    List: typeof List;
    Log: typeof Log;
    Text: typeof Text;
    Listbar: typeof Listbar;
    widget: {
      Screen: typeof Screen;
      Box: typeof Box;
      List: typeof List;
      Log: typeof Log;
      Text: typeof Text;
      Line: typeof Element;
      Listbar: typeof Listbar;
      ScrollableBox: typeof ScrollableBox;
      Element: typeof Element;
    };
    colors: any;
    escape: (text: string) => string;
    stripTags: (text: string) => string;
    parseTags: (text: string) => string[];
    generateTags: (style: any, text: string) => string;
    cleanTags: (text: string) => string;
    Program: any;
    program: any;
    Tput: any;
    tput: any;
    unicode: any;
    helpers: any;
    merge: any;
    asort: any;
    hsort: any;
    findFile: any;
    dropUnicode: (text: string) => string;
  }

  const blessed: BlessedNamespace;
  export default blessed;
}
