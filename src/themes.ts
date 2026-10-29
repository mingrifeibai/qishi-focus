import type { Settings } from './core';
export type Style = Settings['style'];
export const THEMES: {
  id: Style;
  name: string;
  english: string;
  description: string;
  quote: string;
  colors: string[];
  mode: 'light' | 'dark';
  tag: string;
}[] = [
  {
    id: 'sage',
    name: '松间留白',
    english: 'THE QUIET HOURS',
    description: '暖纸、远山与松绿。为注意力留一处安静的空间。',
    quote: '留一处安静，给当下。',
    colors: ['#eef0e6', '#708769', '#d8dfca'],
    mode: 'light',
    tag: '自然 · 轻盈',
  },
  {
    id: 'cyber',
    name: '霓虹都市',
    english: 'AFTER HOURS / 2077',
    description: '深夜城市、青色电光与紫色轨道。在自己的频道里全速前进。',
    quote: '屏蔽杂讯，接入心流。',
    colors: ['#101024', '#55e6dc', '#ad88ff'],
    mode: 'dark',
    tag: '赛博 · 冷光',
  },
  {
    id: 'blocks',
    name: '积木工坊',
    english: 'MAKE SOMETHING GOOD',
    description: '奶油色积木、玩具小人和清脆的边框。一小块，也能搭出大想法。',
    quote: '一小块，搭起今天。',
    colors: ['#faf3e7', '#e4ad47', '#658dce'],
    mode: 'light',
    tag: '积木 · 玩心',
  },
  {
    id: 'ink',
    name: '烟雨江湖',
    english: 'A MOMENT IN THE MOUNTAINS',
    description: '宣纸、墨色、朱砂与一叶扁舟。执一念，在山水间修习。',
    quote: '心无旁骛，自有江湖。',
    colors: ['#efe9dc', '#536969', '#a44f40'],
    mode: 'light',
    tag: '江湖 · 水墨',
  },
  {
    id: 'pixel',
    name: '像素牧场',
    english: 'A LITTLE LIFE, WELL SPENT',
    description: '小小农舍、像素伙伴和缓慢生长的田野。把每一段专注种进日子里。',
    quote: '种下一刻，收获一点。',
    colors: ['#f4ebcf', '#71945e', '#bc7a4b'],
    mode: 'light',
    tag: '像素 · 田园',
  },
];
export function themeFor(style: Style) {
  return THEMES.find((x) => x.id === style) ?? THEMES[0];
}
