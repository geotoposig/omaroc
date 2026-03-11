/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatBox } from './components/ChatBox';
import { Video, VideoOff, Mic, MicOff, SkipForward, Power, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  text: string;
  sender: 'me' | 'partner' | 'system';
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const peerRef = useRef<Peer.Instance | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [mediaError, setMediaError] = useState<string | null>(null);

  const requestMedia = async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setMessages(prev => [...prev, { text: "Camera and microphone connected.", sender: 'system' }]);
    } catch (err: any) {
      console.error("Media error:", err);
      const errorMsg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? "Permission denied. Please allow camera and microphone access in your browser settings and refresh."
        : "Could not access camera/microphone. Please ensure they are connected and not in use by another app.";
      setMediaError(errorMsg);
      setMessages(prev => [...prev, { text: errorMsg, sender: 'system' }]);
    }
  };

  useEffect(() => {
    // Initialize Socket
    const newSocket = io();
    socketRef.current = newSocket;
    setSocket(newSocket);

    requestMedia();

    newSocket.on('partner-found', ({ partnerId, roomId, initiator }) => {
      setPartnerId(partnerId);
      setRoomId(roomId);
      setIsSearching(false);
      setIsConnected(true);
      setMessages(prev => [...prev, { text: "Partner found! Say hello.", sender: 'system' }]);
      
      initiatePeer(partnerId, initiator);
    });

    newSocket.on('signal', (data) => {
      if (peerRef.current) {
        peerRef.current.signal(data.signal);
      }
    });

    newSocket.on('receive-message', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'partner' }]);
    });

    newSocket.on('partner-disconnected', () => {
      handleDisconnect();
    });

    newSocket.on('partner-left', () => {
      handleDisconnect();
    });

    return () => {
      newSocket.disconnect();
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const initiatePeer = (partnerId: string, initiator: boolean) => {
    if (!localStream) return;

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStream,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('signal', { to: partnerId, signal });
    });

    peer.on('stream', (stream) => {
      setRemoteStream(stream);
    });

    peer.on('error', (err) => {
      console.error("Peer error:", err);
      handleDisconnect();
    });

    peerRef.current = peer;
  };

  const handleFindPartner = () => {
    if (isSearching) return;
    
    handleDisconnect();
    setIsSearching(true);
    setMessages([{ text: "Searching for a partner...", sender: 'system' }]);
    socketRef.current?.emit('find-partner');
  };

  const handleDisconnect = () => {
    if (roomId) {
      socketRef.current?.emit('leave-room', roomId);
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setRemoteStream(null);
    setPartnerId(null);
    setRoomId(null);
    setIsConnected(false);
    setIsSearching(false);
    setMessages(prev => [...prev, { text: "Partner disconnected.", sender: 'system' }]);
  };

  const sendMessage = (text: string) => {
    if (roomId && socketRef.current) {
      socketRef.current.emit('send-message', { roomId, text });
      setMessages(prev => [...prev, { text, sender: 'me' }]);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => (track.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-zinc-900 font-sans">
      {/* Header */}
      <header className="h-14 border-b border-zinc-200 flex items-center justify-between px-4 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0055ff] rounded flex items-center justify-center">
            <Video className="text-white" size={18} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0055ff]">
            OmeChat
          </h1>
          <span className="text-sm font-bold text-zinc-400 ml-2">Talk to strangers!</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded border border-zinc-200">
            <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {socket?.connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Videos */}
        <div className="w-1/2 flex flex-col border-r border-zinc-200 bg-zinc-50">
          {/* Partner Video (Top) */}
          <div className="flex-1 relative p-2">
            <VideoPlayer stream={remoteStream} label="Stranger" />
          </div>
          
          {/* Local Video (Bottom) - Smaller */}
          <div className="h-1/3 relative p-2 border-t border-zinc-200">
            <VideoPlayer stream={localStream} muted label="You" />
            
            {mediaError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm p-4 text-center">
                <div className="max-w-xs">
                  <VideoOff className="text-red-500 mx-auto mb-2" size={24} />
                  <p className="text-xs text-zinc-600 mb-3">{mediaError}</p>
                  <button 
                    onClick={requestMedia}
                    className="px-4 py-2 bg-[#0055ff] text-white rounded text-xs font-bold hover:bg-blue-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={toggleVideo}
                className={`p-2 rounded border transition-all ${videoEnabled ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-red-500 border-red-600 text-white'}`}
              >
                {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
              <button 
                onClick={toggleAudio}
                className={`p-2 rounded border transition-all ${audioEnabled ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-red-500 border-red-600 text-white'}`}
              >
                {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
            </div>
          </div>

          {/* Bottom Control: Next Button */}
          <div className="p-4 bg-white border-t border-zinc-200 flex justify-center">
            <button
              onClick={handleFindPartner}
              disabled={isSearching}
              className={`
                flex items-center gap-2 px-12 py-3 rounded font-bold text-xl transition-all
                ${isSearching 
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                  : 'bg-[#0055ff] text-white hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-blue-200'}
              `}
            >
              {isSearching ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <SkipForward size={24} />
                  {isConnected ? 'Next' : 'Start'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Chat */}
        <div className="w-1/2 flex flex-col">
          <ChatBox 
            messages={messages} 
            onSendMessage={sendMessage} 
            disabled={!isConnected} 
          />
        </div>
      </main>
    </div>
  );
}
