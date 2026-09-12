import React, { useEffect, useRef } from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus close button on open
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="privacy-modal-backdrop"
    >
      <div
        className="modal-container"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="privacy-modal-title">隐私政策与数据说明</h2>
          <button
            type="button"
            ref={closeButtonRef}
            className="btn-modal-close"
            onClick={onClose}
            aria-label="关闭隐私说明"
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          <section className="privacy-section">
            <h3>1. 仅限公开歌单</h3>
            <p>
              PlaylistOut 仅支持解析无需登录即可在公开网页访问的 QQ 音乐公开歌单。我们无法、也不会尝试获取或解析任何私密歌单、仅自己可见或需要授权访问的受限内容。
            </p>
          </section>

          <section className="privacy-section">
            <h3>2. 零数据持久化存储</h3>
            <p>
              服务端（Cloudflare Worker）采用纯无状态设计。处理完成后即时返回结果，<strong>绝不在服务器持久化存储</strong>您提交的歌单链接、歌单 ID、歌曲列表、歌曲标题、歌手、专辑等任何歌单内容。
            </p>
          </section>

          <section className="privacy-section">
            <h3>3. 浏览器本地安全导出</h3>
            <p>
              TXT、CSV、Excel (.xlsx) 与 JSON 文件的构建与下载，以及各种格式的剪贴板复制操作，<strong>100% 在您的浏览器端本地完成</strong>。文件绝不上传至任何服务器或云存储。
            </p>
          </section>

          <section className="privacy-section">
            <h3>4. 匿名聚合统计</h3>
            <p>
              为了维护系统稳定性与防滥用监控，系统仅记录无用户标识的<strong>宏观匿名计数</strong>（如“今日成功解析总数”、“平台累计成功次数”）。我们绝不记录或存储 IP 地址、设备信息、Cookie、QQ 账号或歌单详情。
            </p>
          </section>

          <section className="privacy-section">
            <h3>5. 托管基础设施与开源</h3>
            <p>
              PlaylistOut 前端托管于 GitHub Pages，无状态 API 运行于 Cloudflare Workers，代码完全公开透明。标准网络访问受相应云平台基础网络安全政策保护。
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-primary btn-modal-confirm"
            onClick={onClose}
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
