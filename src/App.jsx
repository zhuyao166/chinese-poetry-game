import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Button, message, theme, Progress, Select, Statistic } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { Countdown } = Statistic;

const poems = [
  {
    id: 'jingyes',
    title: '静夜思',
    content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    author: '李白',
    difficulty: 1
  },
  {
    id: 'chuzhong',
    title: '出塞',
    content: '秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。',
    author: '王昌龄',
    difficulty: 2
  },
  {
    id: 'huanghelou',
    title: '黄鹤楼送孟浩然之广陵',
    content: '故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。',
    author: '李白',
    difficulty: 2
  },
  {
    id: 'chunxiao',
    title: '春晓',
    content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
    author: '孟浩然',
    difficulty: 1
  },
  {
    id: 'dengguanquelou',
    title: '登鹳雀楼',
    content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
    author: '王之涣',
    difficulty: 1
  },
];

// 计算基础时间（秒）：每个字2秒 + 难度系数 * 10秒的额外时间
const calculateTimeLimit = (poem, difficulty) => {
  const charCount = poem.content.replace(/[，。]/g, '').length;
  return charCount * 2 + difficulty * 10;
};

// 计算得分：基础分100 + 剩余时间 * 难度系数 * 10
const calculateScore = (remainingTime, difficulty) => {
  return Math.max(0, 100 + Math.floor(remainingTime / 1000) * difficulty * 10);
};

function SortableItem({ id, content, isCorrect, isInCorrectPosition }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    transition: {
      duration: 150,
      easing: 'ease'
    }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`character ${isDragging ? 'dragging' : ''} ${isCorrect ? 'correct' : ''} ${isInCorrectPosition ? 'hint' : ''}`}
      {...attributes}
      {...listeners}
    >
      {content}
    </div>
  );
}

function App() {
  const { token } = theme.useToken();
  const [currentPoemId, setCurrentPoemId] = useState(poems[0].id);
  const currentPoem = useMemo(() => 
    poems.find(poem => poem.id === currentPoemId),
    [currentPoemId]
  );

  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLimit, setTimeLimit] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState({});
  
  const correctString = useMemo(() => 
    currentPoem.content.replace(/[，。]/g, ''),
    [currentPoem]
  );

  const [characters, setCharacters] = useState(() => {
    return currentPoem.content
      .split('')
      .filter(char => char !== '，' && char !== '。')
      .sort(() => Math.random() - 0.5)
      .map((char, index) => ({
        id: `char-${index}`,
        content: char,
        isCorrect: false
      }));
  });

  // 当诗句改变时重置游戏
  useEffect(() => {
    setIsCompleted(false);
    setShowHint(false);
    setGameStarted(false);
    setScore(0);
    setTimeLimit(Date.now() + calculateTimeLimit(currentPoem, currentPoem.difficulty) * 1000);
    setCharacters(
      currentPoem.content
        .split('')
        .filter(char => char !== '，' && char !== '。')
        .sort(() => Math.random() - 0.5)
        .map((char, index) => ({
          id: `char-${index}`,
          content: char,
          isCorrect: false
        }))
    );
  }, [currentPoem]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 0
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 计算进度
  useEffect(() => {
    const currentString = characters.map(item => item.content).join('');
    let correctCount = 0;
    for (let i = 0; i < currentString.length; i++) {
      if (currentString[i] === correctString[i]) {
        correctCount++;
      }
    }
    setProgress(Math.round((correctCount / correctString.length) * 100));
  }, [characters, correctString]);

  const handleDragStart = () => {
    if (!gameStarted) {
      setGameStarted(true);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setCharacters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 检查是否完成
        const currentString = newItems.map(item => item.content).join('');
        
        if (currentString === correctString && !isCompleted) {
          const remainingTime = timeLimit - Date.now();
          const newScore = calculateScore(remainingTime, currentPoem.difficulty);
          setScore(newScore);
          
          // 更新最高分
          setBestScores(prev => {
            const currentBest = prev[currentPoemId] || 0;
            return {
              ...prev,
              [currentPoemId]: Math.max(currentBest, newScore)
            };
          });

          message.success(`恭喜你完成了！得分：${newScore}`);
          setIsCompleted(true);
          setShowHint(false);
          // 标记所有字符为正确
          return newItems.map((item) => ({
            ...item,
            isCorrect: true
          }));
        }
        
        return newItems;
      });
    }
  };

  const handleReset = () => {
    setIsCompleted(false);
    setShowHint(false);
    setGameStarted(false);
    setScore(0);
    setTimeLimit(Date.now() + calculateTimeLimit(currentPoem, currentPoem.difficulty) * 1000);
    setCharacters(prev => 
      prev
        .map(char => ({ ...char, isCorrect: false }))
        .sort(() => Math.random() - 0.5)
    );
  };

  const toggleHint = () => {
    if (!isCompleted) {
      setShowHint(!showHint);
    }
  };

  const handleTimeUp = () => {
    if (!isCompleted && gameStarted) {
      message.error('时间到了！');
      setScore(0);
      setIsCompleted(true);
    }
  };

  return (
    <Layout>
      <Header style={{ background: token.colorPrimary }}>
        <Title level={2} style={{ color: 'white', margin: '14px 0' }}>
          古诗连词游戏
        </Title>
      </Header>
      <Content style={{ padding: '50px', minHeight: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
        <div className="game-container">
          <Title level={3}>{currentPoem.title} - {currentPoem.author}</Title>
            
          <div className="poem-selector">
            <Select 
              value={currentPoemId}
              onChange={(value) => {
                setCurrentPoemId(value);
                setIsCompleted(false);
                setShowHint(false);
              }}
              style={{ width: 300 }}
            >
              {poems.map(poem => (
                <Option key={poem.id} value={poem.id}>
                  《{poem.title}》 - {poem.author}
                </Option>
              ))}
            </Select>
          </div>

          <div className="game-stats">
            <div className="timer">
              {!isCompleted && timeLimit && (
                <Countdown
                  value={timeLimit}
                  format="mm:ss"
                  onFinish={handleTimeUp}
                />
              )}
            </div>
            <div className="score">
              当前得分：{score}
              {bestScores[currentPoemId] > 0 && (
                <div className="best-score">
                  最高得分：{bestScores[currentPoemId]}
                </div>
              )}
            </div>
          </div>

          <div className="progress-container">
            <Progress percent={progress} status={isCompleted ? "success" : "active"} />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <SortableContext items={characters.map(char => char.id)}>
              <div className="characters-container">
                {characters.map((char, index) => (
                  <SortableItem 
                    key={char.id} 
                    id={char.id} 
                    content={char.content}
                    isCorrect={char.isCorrect}
                    isInCorrectPosition={showHint && char.content === correctString[index]}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="button-group">
            <Button 
              type="primary" 
              onClick={handleReset}
            >
              重新开始
            </Button>
            <Button 
              onClick={toggleHint}
              disabled={isCompleted}
            >
              {showHint ? '隐藏提示' : '显示提示'}
            </Button>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
