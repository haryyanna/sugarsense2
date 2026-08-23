import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Heart, User, Clock, MoreVertical, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createNeonCommunityPost,
  deleteNeonCommunityPost,
  isNeonEnabled,
  likeNeonCommunityPost,
  listNeonCommunityPosts,
  updateNeonCommunityPost
} from '../lib/neonApi';
import { enqueueSheetsBackup, flushSheetsBackupQueue } from '../lib/sheetsBackup';
import './Community.css';

const COMMUNITY_STORAGE_KEY = 'moodify_community_posts';

const sortNewest = (arr) => [...arr].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
const normalizeUserName = (value) => String(value || '').trim().toLowerCase();
const getActiveUserName = (fallback = '') => String(localStorage.getItem('moodify_currentUser') || fallback || '').trim();

const Community = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [currentUser, setCurrentUser] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const activeUserName = getActiveUserName(currentUser);

  const persistPosts = (nextPosts) => {
    setPosts(nextPosts);
    localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(nextPosts));
  };

  const fetchCloudPosts = async () => {
    if (!isNeonEnabled()) return { ok: false, reason: 'Neon API tidak aktif.' };
    try {
      const rows = await listNeonCommunityPosts();
      persistPosts(rows);
      setIsCloudMode(true);
      return { ok: true };
    } catch (error) {
      setIsCloudMode(false);
      return { ok: false, error };
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const loggedInUser = localStorage.getItem('moodify_currentUser') || '';
      setCurrentUser(loggedInUser);

      if (loggedInUser) {
        const liked = localStorage.getItem(`moodify_liked_posts_${loggedInUser}`);
        if (liked) {
          setLikedPosts(new Set(JSON.parse(liked)));
        }
      }

      if (isNeonEnabled()) {
        const cloud = await fetchCloudPosts();
        if (cloud.ok) {
          setSyncNotice('');
          return;
        }

        setSyncNotice(`Mode lokal aktif: ${cloud.error?.message || cloud.reason || 'Cloud belum siap'}`);
      }

      const savedPosts = localStorage.getItem(COMMUNITY_STORAGE_KEY);
      if (savedPosts) setPosts(sortNewest(JSON.parse(savedPosts)));
      if (!isNeonEnabled()) {
        setSyncNotice('Neon belum aktif. Agar posting terlihat semua user, aktifkan cloud sync.');
      }
    };

    loadInitialData();

    const intervalId = setInterval(async () => {
      await fetchCloudPosts();
    }, 8000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const cloud = await fetchCloudPosts();
    if (!cloud.ok) {
      if (cloud.error) {
        setSyncNotice(`Refresh gagal: ${cloud.error.message}`);
      } else {
        setSyncNotice(cloud.reason || 'Refresh gagal.');
      }
    } else {
      setSyncNotice('Feed komunitas tersinkron dari cloud.');
    }
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setSyncNotice('');
    const activeUser = getActiveUserName(currentUser);
    if (!activeUser) {
      setSyncNotice('Username akun belum ditemukan. Login ulang dulu, lalu coba posting lagi.');
      return;
    }
    setCurrentUser(activeUser);
    const content = newPost.trim();

    if (isNeonEnabled()) {
      try {
        await createNeonCommunityPost({ authorName: activeUser, content });
        enqueueSheetsBackup({
          eventType: 'community_post_created',
          username: activeUser,
          payload: { content }
        });
        flushSheetsBackupQueue().catch(() => {});
        setNewPost('');
        setIsCloudMode(true);
        await fetchCloudPosts();
      } catch (error) {
        setSyncNotice(`Gagal sinkron ke server: ${error?.message || 'Unknown error'}`);
      }
      return;
    }

    if (!isNeonEnabled()) {
      setSyncNotice('Posting diblokir karena cloud belum aktif. Supaya terlihat semua user, aktifkan Neon API.');
      return;
    }
  };

  const handleLike = async (postId) => {
    const activeUser = localStorage.getItem('moodify_currentUser');
    if (!activeUser) return;

    const newLikedPosts = new Set(likedPosts);
    let likeDelta = 1;
    if (newLikedPosts.has(postId)) {
      newLikedPosts.delete(postId);
      likeDelta = -1;
    } else {
      newLikedPosts.add(postId);
    }
    setLikedPosts(newLikedPosts);
    localStorage.setItem(`moodify_liked_posts_${activeUser}`, JSON.stringify([...newLikedPosts]));

    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    const nextLikes = Math.max(0, Number(target.likes || 0) + likeDelta);

    const updatedPosts = posts.map((p) => (p.id === postId ? { ...p, likes: nextLikes } : p));
    persistPosts(updatedPosts);

    if (isNeonEnabled()) {
      try {
        await likeNeonCommunityPost({ postId, likes: nextLikes });
        enqueueSheetsBackup({
          eventType: 'community_like_updated',
          username: activeUser,
          payload: { post_id: postId, likes: nextLikes }
        });
        flushSheetsBackupQueue().catch(() => {});
      } catch (error) {
        setSyncNotice(`Like belum sinkron ke server: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} hari yang lalu`;
    if (hours > 0) return `${hours} jam yang lalu`;
    if (minutes > 0) return `${minutes} menit yang lalu`;
    return 'Baru saja';
  };

  const canManagePost = (post) => normalizeUserName(post.author) === normalizeUserName(activeUserName);

  const startEdit = (post) => {
    if (!canManagePost(post)) return;
    setOpenMenuPostId(null);
    setEditingPostId(post.id);
    setEditingText(post.text);
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditingText('');
  };

  const saveEdit = async (post) => {
    const trimmed = editingText.trim();
    if (!trimmed || !canManagePost(post)) return;

    let cloudErrorMessage = '';
    if (isNeonEnabled()) {
      try {
        await updateNeonCommunityPost({ postId: post.id, authorName: post.author, content: trimmed });
      } catch (error) {
        cloudErrorMessage = error?.message || 'Unknown error';
      }
    }

    const updatedPosts = posts.map((p) => (p.id === post.id ? { ...p, text: trimmed } : p));
    persistPosts(updatedPosts);
    setEditingPostId(null);
    setEditingText('');
    if (cloudErrorMessage) {
      setSyncNotice(`Edit belum sinkron penuh ke server: ${cloudErrorMessage}`);
    } else if (isNeonEnabled()) {
      enqueueSheetsBackup({
        eventType: 'community_post_updated',
        username: activeUserName,
        payload: { post_id: post.id, content: trimmed }
      });
      flushSheetsBackupQueue().catch(() => {});
      await fetchCloudPosts();
    }
  };

  const deletePost = async (post) => {
    if (!canManagePost(post)) return;
    if (!window.confirm('Hapus postingan ini?')) return;

    let cloudErrorMessage = '';
    if (isNeonEnabled()) {
      try {
        await deleteNeonCommunityPost({ postId: post.id, authorName: post.author });
      } catch (error) {
        cloudErrorMessage = error?.message || 'Unknown error';
      }
    }

    const updatedPosts = posts.filter((p) => p.id !== post.id);
    persistPosts(updatedPosts);
    setOpenMenuPostId(null);
    if (cloudErrorMessage) {
      setSyncNotice(`Hapus lokal berhasil, tetapi server gagal: ${cloudErrorMessage}`);
    } else if (isNeonEnabled()) {
      enqueueSheetsBackup({
        eventType: 'community_post_deleted',
        username: activeUserName,
        payload: { post_id: post.id }
      });
      flushSheetsBackupQueue().catch(() => {});
      await fetchCloudPosts();
    }
  };

  return (
    <div className="community-container animate-fade-in">
      <header className="community-header">
        <button className="icon-btn-rounded" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="feature-heading"><Users className="feature-heading-icon" /><h2>Ruang Berbagi</h2></div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Komunitas Supportif</span>
        </div>
        <div style={{ width: 40 }} />
      </header>

      <main className="community-content">
        <div className="community-info-card glass-card">
          {activeUserName && (
            <p style={{ marginTop: 0, marginBottom: '8px', fontSize: '12px', color: '#065f46' }}>
              Nama posting aktif: <strong>{activeUserName}</strong>
            </p>
          )}
          <p>Bagikan perasaanmu. Semua posting akan terlihat oleh user lain jika sinkronisasi server aktif.</p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: isCloudMode ? '#166534' : '#92400e' }}>
            Status sinkronisasi: {isCloudMode ? 'Cloud aktif (lintas device)' : 'Mode lokal'}
          </p>
          <button
            type="button"
            className="community-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Menyegarkan...' : 'Refresh Feed Cloud'}
          </button>
          {syncNotice && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#b45309' }}>{syncNotice}</p>
          )}
        </div>

        <form onSubmit={handlePost} className="post-input-container glass-card">
          {activeUserName && (
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#0f766e', fontWeight: 700 }}>
              Posting sebagai: {activeUserName}
            </p>
          )}
          <textarea
            placeholder="Apa yang sedang kamu rasakan saat ini?..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            maxLength={280}
          />
          <div className="post-input-footer">
            <span className="char-count">{newPost.length}/280</span>
            <button type="submit" className="btn-primary post-btn" disabled={!newPost.trim()}>
              Bagikan <Send size={16} />
            </button>
          </div>
        </form>

        <div className="posts-feed">
          {posts.map((post) => (
            <div key={post.id} className="post-card glass-card">
              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar"><User size={14} /></div>
                  <span>{post.author}</span>
                </div>
                <div className="post-header-right">
                  <div className="post-time">
                    <Clock size={12} />
                    <span>{formatTime(post.timestamp)}</span>
                  </div>
                  {canManagePost(post) && (
                    <div className="post-menu-wrapper">
                      <button
                        type="button"
                        className="post-menu-btn"
                        onClick={() => setOpenMenuPostId((prev) => (prev === post.id ? null : post.id))}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuPostId === post.id && (
                        <div className="post-menu-dropdown">
                          <button type="button" onClick={() => startEdit(post)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button type="button" onClick={() => deletePost(post)} className="danger-action">
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {editingPostId === post.id ? (
                <div className="post-edit-box">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    maxLength={280}
                  />
                  <div className="post-edit-actions">
                    <button type="button" className="btn-secondary" onClick={cancelEdit}>
                      <X size={14} /> Batal
                    </button>
                    <button type="button" className="btn-primary" onClick={() => saveEdit(post)} disabled={!editingText.trim()}>
                      <Check size={14} /> Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <p className="post-body">{post.text}</p>
              )}

              <div className="post-actions">
                <button
                  type="button"
                  className={`like-btn ${likedPosts.has(post.id) ? 'liked' : ''} hover-lift`}
                  onClick={() => handleLike(post.id)}
                >
                  <Heart size={16} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                  <span>{post.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Community;
