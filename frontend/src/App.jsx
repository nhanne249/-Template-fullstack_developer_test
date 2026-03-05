import React, { useState, useRef, useEffect } from 'react';
import { Layout, Menu, Button, Badge, Dropdown, Flex } from 'antd';
import { Sender, Bubble, Attachments } from '@ant-design/x';
import { LeftOutlined, PlusOutlined, UserOutlined, LinkOutlined, CloudUploadOutlined, UploadOutlined } from '@ant-design/icons';
import './App.css';

const { Sider, Content } = Layout;

import {
  HomeIcon, DocsIcon, DesignIcon, PresentationIcon,
  GalleryIcon, VideoIcon, Icon3DotsIcon, TemplatesIcon,
  BrandIcon, FolderOpenIcon, SolarLoginIcon, CrownIcon
} from './assets/icons';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState(localStorage.getItem('chatSessionId') || '');
  const scrollRef = useRef(null);

  const [openAttachments, setOpenAttachments] = useState(false);
  const [items, setItems] = useState([]);
  const senderRef = useRef(null);
  const attachmentsRef = useRef(null);
  const MAX_COUNT = 5;

  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      setOpenAttachments(true);
    } else {
      setOpenAttachments(false);
    }
  }, [items.length]);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/history?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const formattedHistory = data.map((msg, index) => ({
              key: msg.created_at || Date.now() + index,
              role: msg.role === 'model' ? 'ai' : 'user',
              content: msg.content,
            }));
            setMessages(formattedHistory);
          }
        })
        .catch(err => console.error( err));
    }
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!inputValue.trim() && items.length === 0) || isGenerating) return;

    const hasFiles = items.length > 0;
    let content = inputValue;
    if (hasFiles) {
      const fileNames = items.map(item => item.name).join(', ');
      content = inputValue + (inputValue ? '\n' : '') + `[Attachments: ${fileNames}]`;
    }

    const userMessage = {
      key: Date.now(),
      role: 'user',
      content: content.trim() || 'Mock File',
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    setInputValue('');
    setItems([]);
    setOpenAttachments(false);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content, sessionId: sessionId || undefined, hasFiles }),
      });

      if (!response.ok) throw new Error("API response error");

      const data = await response.json();
      
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }

      const aiMessage = {
        key: Date.now() + 1,
        role: 'ai',
        content: data.content || "Sorry, I couldn't generate a response.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage = {
        key: Date.now() + 1,
        role: 'ai',
        content: "Error: Could not connect to the chat service.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const senderHeader = (
    <Sender.Header
      closable={false}
      forceRender
      title="Attachments"
      open={openAttachments}
      onOpenChange={setOpenAttachments}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        ref={attachmentsRef}
        multiple
        maxCount={MAX_COUNT}
        beforeUpload={() => false}
        items={items}
        onChange={({ file, fileList }) => {
          const updatedFileList = fileList.map(item => {
            if (item.uid === file.uid && file.status !== 'removed' && item.originFileObj) {
              if (item.url?.startsWith('blob:')) {
                URL.revokeObjectURL(item.url);
              }
              return {
                ...item,
                url: URL.createObjectURL(item.originFileObj),
              };
            }
            return item;
          });
          setItems(updatedFileList);
        }}
        placeholder={type =>
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
        }
        getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  );

  const acceptItem = [
    {
      key: 'files',
      label: (
        <div className="flex items-center gap-3 p-1">
          <div className="bg-gray-50 p-2 rounded-full flex items-center justify-center border border-gray-100">
            <UploadOutlined className="text-[17px] text-gray-700 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-[14px]">Upload files</span>
            <span className="text-xs text-gray-500 font-medium">Doc, docx, pdf, txt, xlsx, pptx, pages, key and more</span>
          </div>
        </div>
      ),
    },
    {
      key: 'image',
      label: (
        <div className="flex items-center gap-3 p-1 mt-1">
          <div className="bg-gray-50 p-2 rounded-full flex items-center justify-center border border-gray-100">
            <UploadOutlined className="text-[17px] text-gray-700 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-[14px]">Upload photos</span>
            <span className="text-xs text-gray-500 font-medium">Png, jpg, jpeg, tif, webp, tiff and more</span>
          </div>
        </div>
      ),
    },
  ];

  const selectFile = ({ key }) => {
    attachmentsRef.current?.select({
      accept: key === 'image' ? '.png,.jpg,.jpeg,.tif,.webp,.tiff' : '.doc,.docx,.pdf,.txt,.xlsx,.pptx,.pages,.key',
      multiple: true,
    });
  };

  const getMenuItem = (key, Icon, text, isUpgrade = false) => ({
    key,
    className: 'custom-menu-item',
    label: (
      <div className="flex flex-col items-center justify-center h-full w-full gap-1 pt-1">
        <Icon className={`w-[22px] h-[22px] ${isUpgrade ? "text-blue-600" : "text-gray-600"}`} />
        <span className={`text-[10px] leading-tight ${isUpgrade ? "text-blue-600 font-medium" : "text-gray-500"}`}>{text}</span>
      </div>
    ),
  });

  const menuItems = [
    getMenuItem('home', HomeIcon, 'Home'),
    getMenuItem('document', DocsIcon, 'Document'),
    getMenuItem('design', DesignIcon, 'Design'),
    getMenuItem('presentation', PresentationIcon, 'Presentation'),
    getMenuItem('image', GalleryIcon, 'Image'),
    getMenuItem('video', VideoIcon, 'Video'),
    getMenuItem('more', Icon3DotsIcon, 'More'),
    { type: 'divider', className: 'my-2 mx-4 border-gray-100' },
    getMenuItem('templates', TemplatesIcon, 'Templates'),
    getMenuItem('brand', BrandIcon, 'Brand'),
    getMenuItem('projects', FolderOpenIcon, 'Projects'),
  ];

  const bottomMenuItems = [
    getMenuItem('signin', SolarLoginIcon, 'Sign In'),
    {
      key: 'upgrade',
      className: 'custom-menu-item upgrade-item mt-2',
      label: (
        <div className="flex flex-col items-center justify-center p-2">
          <div className="bg-blue-600 text-white p-2 flex items-center justify-center rounded-3xl mb-1 shadow-sm h-10 w-10">
            <CrownIcon className="w-[24px] h-[24px]" />
          </div>
          <span className="text-[10px] leading-tight text-gray-500 font-medium tracking-wide">Upgrade</span>
        </div>
      )
    }
  ];

  return (
    <Layout className="min-h-screen" style={{ background: '#ffffff' }}>
      <Sider 
        width={85} 
        style={{ background: '#ffffff', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10, borderRight: '1px solid #f0f0f0' }}
      >
        <div className="flex flex-col h-full bg-white pt-4 pb-4 overflow-y-auto overflow-x-hidden hide-scrollbar">
          <Menu 
            mode="inline" 
            defaultSelectedKeys={['home']}
            items={menuItems}
            style={{ borderRight: 'none', flexGrow: 1 }}
          />
          <Menu 
            mode="inline" 
            selectable={false}
            items={bottomMenuItems}
            style={{ borderRight: 'none' }}
          />
        </div>
      </Sider>
      <Layout style={{ background: '#ffffff', marginLeft: 85 }}>
        <Content className="flex flex-col h-screen bg-white">
          
          <div className="flex-none px-12 pt-8">
            <a href="/" className="block mb-6 mt-1 w-max">
              <img 
                src="https://www.template.net/assets/icons/new-logo.svg" 
                alt="Template.net Logo" 
                className="h-6 object-contain object-left"
              />
            </a>

            <Button 
              icon={<LeftOutlined className="text-[11px]" />} 
              shape="round" 
              className="px-5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center font-medium h-9 shadow-sm"
            >
              Back
            </Button>
          </div>
          
          <div className="flex-grow hide-scrollbar overflow-y-auto px-12 pb-6" ref={scrollRef}>
            <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6 pt-4">
              {messages.map((msg) => (
                <div key={msg.key} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                        <img src="https://www.template.net/assets/icons/new-logo.svg" alt="AI" className="w-4 h-4 object-contain" />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-gray-100/80 hover:bg-gray-100 transition-colors rounded-2xl rounded-tr-sm px-5 py-3 text-gray-800' : 'bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 text-gray-800'}`}>
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex w-full justify-start">
                  <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                      <img src="https://www.template.net/assets/icons/new-logo.svg" alt="AI" className="w-4 h-4 object-contain" />
                    </div>
                  </div>
                  <Bubble
                    loading
                    styles={{ bubble: { borderRadius: '16px', borderTopLeftRadius: '2px', backgroundColor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex-none px-12 pb-10 w-full pt-2">
            <div className="max-w-[1000px] mx-auto w-full">
              <Sender 
                ref={senderRef}
                header={senderHeader}
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSend}
                loading={isGenerating}
                placeholder="Ask template.net"
                className="w-full bg-white border border-[#e5e7eb] rounded-[16px] p-3 px-4 min-h-[120px] focus-within:border-gray-300 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.03)] [&_.ant-input]:resize-none [&_.ant-input]:text-[15px] [&_.ant-input]:text-gray-700 [&_.ant-input::placeholder]:text-gray-400 [&_.ant-input::placeholder]:font-medium [&_.ant-input-affix-wrapper]:border-none [&_.ant-input-affix-wrapper]:shadow-none [&_.ant-input-affix-wrapper]:bg-transparent [&_.ant-input-affix-wrapper]:p-0"
                prefix={false}
                suffix={false}
                footer={(_, info) => {
                  const { SendButton } = info.components;
                  return (
                    <div className="flex justify-between items-center w-full pt-2 mt-1">
                      <Badge dot={items.length > 0 && !openAttachments}>
                        <Dropdown
                          trigger={['click']}
                          menu={{ items: acceptItem, onClick: selectFile }}
                          placement="top"
                          overlayStyle={{ minWidth: '340px', padding: '6px', borderRadius: '12px' }}
                        >
                          <Button disabled={items.length >= MAX_COUNT} type="text" icon={<PlusOutlined className="text-gray-600 text-[22px]" />} className="hover:bg-gray-100 flex items-center justify-center w-8 h-8 p-0" />
                        </Dropdown>
                      </Badge>
                      <SendButton 
                        type="primary" 
                        shape="round" 
                        disabled={isGenerating || (!inputValue.trim() && items.length === 0)}
                        className={`${(isGenerating || (!inputValue.trim() && items.length === 0)) ? 'bg-gray-200 text-gray-400' : 'bg-[#2a00ff] hover:bg-blue-800 text-white'} font-semibold border-none shadow-none text-[13px] px-5 h-[36px] flex items-center justify-center tracking-wide transition-colors`}
                        style={{ borderRadius: '18px' }}
                        icon={null}
                      >
                        <span className={`mr-1.5 ${isGenerating || (!inputValue.trim() && items.length === 0) ? 'text-gray-400' : 'text-white'} text-[15px]`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><g clip-path="url(#clip0_5326_70977)"><path d="M4.68126 10.673C4.48835 9.60881 3.70386 8.27234 2.21203 7.19575C1.47897 6.66363 0.733055 6.31714 0 6.16865V5.64891C1.45325 5.31479 2.88078 4.37432 3.79388 3.09972C4.25686 2.45624 4.55266 1.82513 4.68126 1.16927H5.22141C5.44004 2.41912 6.44317 3.80508 7.80639 4.73318C8.47514 5.19105 9.16962 5.50041 9.87695 5.64891V6.16865C8.44942 6.45326 6.7904 7.67836 5.96732 8.9282C5.55578 9.55931 5.31143 10.1409 5.22141 10.673H4.68126Z" fill="white"></path><path d="M12.2695 15.1109C12.131 14.2513 11.5678 13.1718 10.4966 12.3021C9.97029 11.8723 9.43473 11.5924 8.9084 11.4725V11.0527C9.95183 10.7828 10.9768 10.0231 11.6324 8.9936C11.9648 8.47383 12.1772 7.96405 12.2695 7.43429H12.6573C12.8143 8.44384 13.5346 9.56335 14.5133 10.313C14.9935 10.6829 15.4921 10.9327 16 11.0527V11.4725C14.975 11.7024 13.7839 12.692 13.1929 13.7015C12.8974 14.2113 12.722 14.6811 12.6573 15.1109H12.2695Z" fill="white"></path><path d="M12.6677 4.57551C12.6012 4.16266 12.3307 3.6442 11.8162 3.22655C11.5635 3.02013 11.3062 2.88571 11.0535 2.8281V2.62648C11.5546 2.49686 12.0468 2.13202 12.3617 1.63756C12.5214 1.38793 12.6234 1.1431 12.6677 0.888672H12.854C12.9294 1.37353 13.2753 1.91119 13.7453 2.27124C13.976 2.44886 14.2154 2.56887 14.4593 2.62648V2.8281C13.9671 2.93852 13.395 3.41377 13.1112 3.89863C12.9693 4.14346 12.885 4.36909 12.854 4.57551H12.6677Z" fill="white"></path></g><defs><clipPath id="clip0_5326_70977"><rect width="16" height="16" fill="white"></rect></clipPath></defs></svg>
                        </span> {isGenerating ? 'Generating...' : 'Generate Free'}
                      </SendButton>
                    </div>
                  );
                }}
              />

            </div>
          </div>
          
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
