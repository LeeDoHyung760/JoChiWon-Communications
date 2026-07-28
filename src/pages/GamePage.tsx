import { useEffect, useMemo, useState } from 'react';
import { Check, LogOut, MapPin, MessageCircle, PhoneOff, Send, Users, X } from 'lucide-react';
import { GameCanvas } from '../game/GameCanvas';
import { gameEvents } from '../game/events';
import { socket } from '../game/systems/socketClient';
import { CharacterPreview } from '../components/CharacterPreview';
import { DirectRecommendationControls, DirectRecommendationMessage, MeetingPlaceBanner, MeetingPlaceSystemMessage } from '../components/DirectRecommendation';
import { MatchScoreBadge } from '../components/MatchScoreBadge';
import type { UserProfile } from '../types';
import type { ChatMessage, DirectMessage, DirectRequest, DirectRoom, DirectRoomMeetingPlace, GroupRoom, MapId, PlayerState } from '../../shared/socket-events';
import './GamePage.css';
import { LakeParkTutorial } from '../components/LakeParkTutorial';
export function GamePage({ profile, onExit, onEditProfile, onOpenCommunity }: {
    profile: UserProfile;
    onExit: () => void;
    onEditProfile: () => void;
    onOpenCommunity: () => void;
}) {
    const [selected, setSelected] = useState<PlayerState | null>(null), [text, setText] = useState(''), [players, setPlayers] = useState<PlayerState[]>([]), [messages, setMessages] = useState<ChatMessage[]>([]), [request, setRequest] = useState<DirectRequest | null>(null), [notice, setNotice] = useState(''), [groups, setGroups] = useState<GroupRoom[]>([]), [activeGroup, setActiveGroup] = useState<string | null>(null), [location, setLocation] = useState('세종호수공원');
    const [directRooms, setDirectRooms] = useState<DirectRoom[]>([]), [activeDirect, setActiveDirect] = useState<string | null>(null), [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>({}), [directText, setDirectText] = useState(''), [unread, setUnread] = useState<Record<string, number>>({});
    const [guideNearby, setGuideNearby] = useState(false), [guideConversation, setGuideConversation] = useState(true), [guideStep, setGuideStep] = useState(0);
    const [onlineCollapsed, setOnlineCollapsed] = useState(false), [mapOverview, setMapOverview] = useState(false), [mapSignNearby, setMapSignNearby] = useState(false);
    const [nearbyPortal, setNearbyPortal] = useState<{
        destination: MapId;
        label: string;
        theme?: 'mint' | 'blue';
        chargeSeconds: number;
    } | null>(null);
    const [nearbyInteraction, setNearbyInteraction] = useState<{
        destination: MapId;
        label: string;
        buttonLabel: string;
    } | null>(null);
    const [portalProgress, setPortalProgress] = useState(0);
    useEffect(() => { gameEvents.emit('game-input-lock', guideConversation); return () => { if (guideConversation)
        gameEvents.emit('game-input-lock', false); }; }, [guideConversation]);
    useEffect(() => { const overviewChanged = (active: boolean) => setMapOverview(active); gameEvents.on('map-overview-changed', overviewChanged); return () => { gameEvents.off('map-overview-changed', overviewChanged); }; }, []);
    useEffect(() => { const proximityChanged = (nearby: boolean) => setMapSignNearby(nearby); gameEvents.on('map-sign-proximity-changed', proximityChanged); return () => { gameEvents.off('map-sign-proximity-changed', proximityChanged); }; }, []);
    useEffect(() => { const portalChanged = (portal: {
        destination: MapId;
        label: string;
        theme?: 'mint' | 'blue';
        chargeSeconds: number;
    } | null) => { setNearbyPortal(portal); setPortalProgress(0); }, chargeChanged = (progress: number) => setPortalProgress(progress); gameEvents.on('world-portal-proximity-changed', portalChanged); gameEvents.on('portal-charge-progress', chargeChanged); return () => { gameEvents.off('world-portal-proximity-changed', portalChanged); gameEvents.off('portal-charge-progress', chargeChanged); }; }, []);
    useEffect(() => { const interactionChanged = (interaction: {
        destination: MapId;
        label: string;
        buttonLabel: string;
    } | null) => setNearbyInteraction(interaction); gameEvents.on('world-interaction-proximity-changed', interactionChanged); return () => { gameEvents.off('world-interaction-proximity-changed', interactionChanged); }; }, []);
    useEffect(() => { if (location !== '세종호수공원') {
        setGuideNearby(false);
        setGuideConversation(false);
    } }, [location]);
    useEffect(() => {
        const selectedHandler = (p: PlayerState) => setSelected(p), locationHandler = (name: string) => setLocation(name), guideProximity = (nearby: boolean) => setGuideNearby(nearby), isOther = (p: PlayerState) => p.id !== socket.id && p.nickname !== profile.nickname, replace = (users: PlayerState[]) => setPlayers(users.filter(isOther)), joined = (p: PlayerState) => setPlayers(old => isOther(p) ? [...old.filter(x => x.id !== p.id), p] : old.filter(x => x.id !== p.id)), moved = (p: PlayerState) => setPlayers(old => isOther(p) ? old.map(x => x.id === p.id ? p : x) : old.filter(x => x.id !== p.id)), left = (id: string) => setPlayers(old => old.filter(x => x.id !== id)), chat = (m: ChatMessage) => setMessages(old => [...old.slice(-79), m]), directRequested = (r: DirectRequest) => setRequest(r), rejected = () => setNotice('1:1 채팅 요청이 거절되었어요.'), started = (room: DirectRoom) => { setDirectRooms(old => [...old.filter(r => r.id !== room.id), room]); setActiveDirect(room.id); setNotice('1:1 채팅을 시작했어요.'); }, directMessage = (m: DirectMessage) => { setDirectMessages(old => ({ ...old, [m.directRoomId]: [...(old[m.directRoomId] ?? []), m] })); setActiveDirect(current => { if (current !== m.directRoomId)
            setUnread(old => ({ ...old, [m.directRoomId]: (old[m.directRoomId] ?? 0) + 1 })); return current; }); }, recommendationCompleted = (data: {
            directRoomId: string;
            message: DirectMessage;
        }) => directMessage(data.message), meetingUpdated = (data: {
            roomId: string;
            meetingPlace: DirectRoomMeetingPlace | null;
        }) => setDirectRooms(old => old.map(room => room.id === data.roomId ? { ...room, meetingPlace: data.meetingPlace ?? undefined } : room)), group = (g: GroupRoom) => { setGroups(old => [...old.filter(x => x.id !== g.id), g]); setActiveGroup(g.id); }, error = (m: string) => setNotice(m);
        gameEvents.on('network-user-selected', selectedHandler);
        gameEvents.on('location-changed', locationHandler);
        gameEvents.on('guide-proximity-changed', guideProximity);
        gameEvents.on('chat-received', chat);
        socket.on('currentMapUsers', replace);
        socket.on('onlineUsersUpdated', replace);
        socket.on('userJoined', joined);
        socket.on('userMoved', moved);
        socket.on('userLeft', left);
        socket.on('directChatRequested', directRequested);
        socket.on('directChatRejected', rejected);
        socket.on('directChatStarted', started);
        socket.on('directMessageReceived', directMessage);
        socket.on('directRecommendationCompleted', recommendationCompleted);
        socket.on('directMeetingPlaceUpdated', meetingUpdated);
        socket.on('groupCreated', group);
        socket.on('groupUpdated', group);
        socket.on('errorMessage', error);
        return () => { gameEvents.off('network-user-selected', selectedHandler); gameEvents.off('location-changed', locationHandler); gameEvents.off('guide-proximity-changed', guideProximity); gameEvents.off('chat-received', chat); socket.off('currentMapUsers', replace); socket.off('onlineUsersUpdated', replace); socket.off('userJoined', joined); socket.off('userMoved', moved); socket.off('userLeft', left); socket.off('directChatRequested', directRequested); socket.off('directChatRejected', rejected); socket.off('directChatStarted', started); socket.off('directMessageReceived', directMessage); socket.off('directRecommendationCompleted', recommendationCompleted); socket.off('directMeetingPlaceUpdated', meetingUpdated); socket.off('groupCreated', group); socket.off('groupUpdated', group); socket.off('errorMessage', error); };
    }, []);
    const directRoom = directRooms.find(r => r.id === activeDirect), partner = directRoom?.participants.find(p => p.id !== socket.id), roomMessages = useMemo(() => activeDirect ? directMessages[activeDirect] ?? [] : [], [activeDirect, directMessages]);
    const chatAllowed = location === '수목원' || location === '공동캠퍼스', groupChatAllowed = location === '공동캠퍼스';
    const send = () => { if (!chatAllowed)
        return setNotice('대화는 수목원과 공동캠퍼스에서 시작할 수 있어요.'); const message = text.trim(); if (!message)
        return; if (activeGroup && !groupChatAllowed)
        return setNotice('동아리 단체 채팅은 공동캠퍼스에서 이용할 수 있어요.'); activeGroup ? socket.emit('sendGroupChat', { groupId: activeGroup, message }) : socket.emit('sendNearbyChat', message); setText(''); }, sendDirect = () => { if (!chatAllowed)
        return setNotice('1:1 대화는 수목원과 공동캠퍼스에서 이용할 수 있어요.'); const message = directText.trim(); if (!message || !activeDirect)
        return; socket.emit('directMessage', { directRoomId: activeDirect, message }); setDirectText(''); }, close = () => { socket.disconnect(); onExit(); }, editProfile = () => { socket.disconnect(); onEditProfile(); };
    return <main className={`game-page ${mapOverview ? 'is-map-overview' : ''}`}><div className="game-layout"><GameCanvas profile={profile}/>{guideNearby && !guideConversation && <button type="button" className="guide-talk-button" onClick={() => { setGuideStep(0); setGuideConversation(true); }}><span>👑</span><div><small>오늘의 소통 여정이 시작돼요</small><b>충녕이에게 먼저 말 걸기</b></div><MessageCircle size={18}/></button>}{mapSignNearby && !mapOverview && !guideConversation && <button type="button" className={`map-view-button ${guideNearby ? 'with-guide' : ''}`} onClick={() => gameEvents.emit('map-overview-toggle', true)}><span>🗺️</span><div><small>지도 표지판이 가까이 있어요</small><b>세종호수공원 지도 보기</b></div><MapPin size={18}/></button>}{nearbyPortal && !mapOverview && !guideConversation && <button type="button" className={`portal-travel-button ${guideNearby || mapSignNearby ? 'with-nearby-actions' : ''}`} onClick={() => gameEvents.emit('travel-to-map', nearbyPortal.destination)}><span>✨</span><div><small>월드 포탈이 열렸어요</small><b>{nearbyPortal.label}(으)로 이동</b></div><MapPin size={18}/></button>}<div className="world-location-chip"><span><MapPin size={15}/></span><div><small>현재 위치</small><b>{location}</b></div><i className={'demo-pass'}>{'소통 체험'}</i></div>{(location === '세종호수공원' || location === '베어트리파크') && <button type="button" className="portal-position-editor" onClick={() => gameEvents.emit('portal-move-to-player')}><span>✨</span><div><small>PORTAL EDITOR</small><b>현재 위치에 포탈 놓기</b></div></button>}<button type="button" className="world-community" onClick={onOpenCommunity}><MessageCircle size={15}/> 커뮤니티</button><button type="button" className="world-exit" onClick={close}><LogOut size={15}/> 나가기</button><aside className={`online ${onlineCollapsed ? 'is-collapsed' : ''}`}><div className="online-heading"><span><Users size={17}/></span><div><small>CO-PLAY NOW</small><h3>함께 체험 중</h3></div><b>{players.length + 1}</b><button type="button" className="online-collapse" onClick={() => setOnlineCollapsed(value => !value)} aria-label={onlineCollapsed ? '함께 체험 중 펼치기' : '함께 체험 중 접기'}>{onlineCollapsed ? '‹' : '접기 ‹'}</button></div><div className="online-list"><button type="button" className="me" onClick={editProfile} title="캐릭터 설정 변경" aria-label={`${profile.nickname}님의 캐릭터 설정 변경`}><CharacterPreview parts={profile.character} small/><div><b>{profile.nickname}</b><small>내 역할을 선택해 주세요</small></div><i /></button>{players.map(p => <button key={p.id} onClick={() => setSelected(p)}><CharacterPreview parts={p.appearance} small/><div><b>{p.nickname}</b><small>{p.isMoving ? '다음 체험으로 이동 중' : '함께할 신호를 기다리는 중'}</small></div><i /></button>)}</div><div className="group-box"><div><b><MessageCircle size={13}/> 함께 만든 연결</b></div>{directRooms.map(r => { const other = r.participants.find(p => p.id !== socket.id); return <button key={r.id} className={activeDirect === r.id ? 'active' : ''} onClick={() => { setActiveDirect(r.id); setUnread(v => ({ ...v, [r.id]: 0 })); }}>💬 {other?.nickname}<small>{unread[r.id] ? `새 메시지 ${unread[r.id]}` : '체험 후 대화'}</small></button>; })}</div><div className="controls"><b>함께하는 방법</b><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 · 빛나는 체험존에서 역할 선택</p></div></aside>{mapOverview && <section className="map-overview-ui"><div><span>🗺️</span><div><small>SEJONG LAKE PARK MAP</small><b>소통 체험 여정 지도</b><p>충녕이 → 바람의 언덕 → 시민광장 순서로 이어져요.</p></div></div><button type="button" onClick={() => gameEvents.emit('map-overview-toggle', false)}><X size={16}/> 지도 닫기</button></section>}{<section className="chat-panel"><header><span><MessageCircle size={15}/></span><div><small>LIVE REACTIONS</small><b>{activeGroup ? groups.find(g => g.id === activeGroup)?.name : '주변의 반응'}</b></div><i>가까운 이웃</i></header><div>{messages.filter(m => activeGroup ? m.channel === 'group' : m.channel === 'nearby').slice(-6).map(m => <p key={m.id}><b>{m.nickname}</b><span>{m.message}</span></p>)}{messages.filter(m => activeGroup ? m.channel === 'group' : m.channel === 'nearby').length === 0 && <p className="chat-empty">채팅 없이도 체험존의 신호와 이모트로 함께할 수 있어요 👋</p>}</div></section>}<div className={`chat ${''}`}><span className="chat-input-icon"><MessageCircle size={17}/></span><div className="chat-input-copy"><small>{activeGroup ? '모임 메시지' : '선택형 주변 메시지'}</small><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !e.nativeEvent.isComposing)
        send(); }} onKeyUp={e => e.stopPropagation()} placeholder='“준비됐어요!”, “좋아요!”처럼 짧게 반응해 보세요'/></div><button onClick={send} aria-label="메시지 보내기"><Send size={17}/></button></div></div>
        {nearbyPortal && !mapOverview && !guideConversation && <section className={`portal-charge-panel ${nearbyPortal.theme === 'blue' ? 'is-blue' : ''} ${guideNearby || mapSignNearby ? 'with-nearby-actions' : ''}`}><span>✨</span><div><small>PORTAL ACTIVATING</small><b>{nearbyPortal.label}(으)로 이동 중</b><div className="portal-charge-steps" style={{ gridTemplateColumns: `repeat(${nearbyPortal.chargeSeconds}, minmax(0, 1fr))` }}>{Array.from({ length: nearbyPortal.chargeSeconds }, (_, index) => <div key={index}><span>{index + 1}</span><i><b style={{ width: `${Math.max(0, Math.min(1, portalProgress * nearbyPortal.chargeSeconds - index)) * 100}%` }}/></i></div>)}</div><em>{nearbyPortal.theme === 'blue' ? '파란 포탈 안에서 3초 동안 머물러 주세요' : `${nearbyPortal.chargeSeconds}초 동안 머물러 주세요`}</em></div></section>}
        {nearbyInteraction && !mapOverview && !guideConversation && <button type="button" className="bear-care-button" onClick={() => gameEvents.emit('travel-to-map', nearbyInteraction.destination)}><span>🐻</span><div><small>{nearbyInteraction.label}</small><b>{nearbyInteraction.buttonLabel}</b></div><MapPin size={18}/></button>}
        {guideConversation && <LakeParkTutorial step={guideStep} onPrevious={() => setGuideStep(step => step - 1)} onNext={() => { if (guideStep < 4)
        setGuideStep(step => step + 1);
    else {
        setGuideConversation(false);
        setNotice('축제광장의 빛나는 체험존에서 첫 관심 콘텐츠를 저장해 보세요!');
    } }}/>}
        {selected && <div className="modal-card profile-card"><button className="close" onClick={() => setSelected(null)}><X /></button><CharacterPreview parts={selected.appearance}/><h2>{selected.nickname}</h2><span className="mbti">{chatAllowed ? '공개 기록을 확인할 수 있어요' : '이 공간에서는 기록만 볼 수 있어요'}</span><MatchScoreBadge profile={profile} other={selected}/><button className="primary" onClick={() => { if (!chatAllowed) {
        setNotice('1:1 대화는 수목원과 공동캠퍼스에서 시작할 수 있어요.');
        setSelected(null);
        return;
    } socket.emit('directChatRequest', selected.id); setNotice('채팅 요청을 보냈어요. 상대방은 편하게 거절할 수 있어요.'); setSelected(null); }}>{chatAllowed ? '1:1 대화 신청' : '대화 가능한 공간 안내'}</button></div>}
        {request && <div className="request-toast"><b>{request.from.nickname}님의 1:1 채팅 요청</b><p>원치 않으면 부담 없이 거절해도 괜찮아요.</p><div><button onClick={() => { socket.emit('directChatReject', request.requestId); setRequest(null); }}><PhoneOff size={16}/> 거절</button><button className="accept" onClick={() => { socket.emit('directChatAccept', request.requestId); setRequest(null); }}><Check size={16}/> 수락</button></div></div>}
        {directRoom && partner && <section className="direct-panel"><header><CharacterPreview parts={partner.appearance} small/><div><b>{partner.nickname}</b><small>1:1 채팅</small></div><button type="button" onClick={() => { socket.emit('directChatClosed', directRoom.id); setActiveDirect(null); }}><X size={17}/></button></header><MeetingPlaceBanner room={directRoom} showToast={setNotice}/><div className="direct-messages">{roomMessages.map(m => m.type === 'ai-recommendation' ? <DirectRecommendationMessage message={m} room={directRoom} showToast={setNotice} key={m.id}/> : m.type === 'system-meeting-place' ? <MeetingPlaceSystemMessage message={m} showToast={setNotice} key={m.id}/> : <p className={m.senderId === socket.id ? 'mine' : ''} key={m.id}><small>{m.nickname}</small><span>{m.message}</span></p>)}</div><DirectRecommendationControls room={directRoom} messageCount={roomMessages.filter(message => message.type === 'user' && !message.deleted).length}/><footer><input value={directText} onChange={e => setDirectText(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !e.nativeEvent.isComposing)
        sendDirect(); }} placeholder="1:1 메시지..."/><button type="button" onClick={sendDirect}><Send size={17}/></button></footer></section>}
        {notice && <button className="notice" onClick={() => setNotice('')}>{notice} ×</button>}</main>;
}