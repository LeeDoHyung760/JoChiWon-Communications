import { assetManifest,customPartColor,customPartId,getPart } from '../data/assetManifest';
import { CharacterPreview } from '../components/CharacterPreview';
import { ThreeCharacterPreview } from '../components/ThreeCharacterPreview';
import type { CharacterModel, PartKind, UserProfile } from '../types';

const modelUrls: Record<Exclude<CharacterModel, 'custom'>, string> = {
  chungnyeong: new URL('../assets/characters/chungnyeong.glb', import.meta.url).href,
  girl1: new URL('../assets/characters/girl_metaverse_animated.glb', import.meta.url).href,
  boy1: new URL('../assets/characters/boy1_3.glb', import.meta.url).href,
  cloths: new URL('../assets/characters/cloths_rig.glb', import.meta.url).href
};

const partLabels: Record<PartKind, {label: string; icon: string}> = {
  hair: {label: '머리', icon: '〰'},
  face: {label: '피부', icon: '🙂'},
  top: {label: '상의', icon: '👕'},
  topLayer: {label: '상의 아래', icon: '🧥'},
  bottom: {label: '하의', icon: '👖'},
  shoes: {label: '신발', icon: '👟'},
  accessory: {label: '악세서리', icon: '👔'}
};

export function CharacterDesignStep({
  model,
  character,
  part,
  selectModel,
  onSubmit,
  editMode,
  onBack
}: {
  model: CharacterModel;
  character: UserProfile['character'];
  part: (k: PartKind, id: string) => void;
  selectModel: (m: CharacterModel) => void;
  onSubmit: () => void;
  editMode: boolean;
  onBack?: () => void;
}) {
  const modelFaces: Record<CharacterModel, string> = {chungnyeong: '🧑🏻‍🌾', girl1: '👧🏻', boy1: '👦🏻', cloths: '🧑🏻', custom: '＋'};

  return (
    <main className="character-design-page">
      <section className="character-design-card">
        <header className="character-design-heading">
          <span className="character-design-sparkle" aria-hidden="true">✧</span>
          <div>
            <h1>{editMode?'캐릭터 설정 변경':'메타버스 속 나를 만들어요'}</h1>
            <p>{editMode?'사용할 캐릭터와 스타일을 다시 선택해보세요':'닉네임과 캐릭터 스타일을 선택해보세요'}</p>
          </div>
          <span className="character-design-step">캐릭터 설정 · 2/2</span>
        </header>

        <div className="character-design-content">
          <aside className="character-design-preview">
            <div className="character-design-aura" aria-hidden="true" />
            <span className="character-design-decoration decoration-one">✧</span>
            <span className="character-design-decoration decoration-two">◇</span>
            <div className="character-design-viewer">
              {model === 'custom' ? (
                <div className="character-design-custom-preview">
                  <CharacterPreview parts={character} />
                </div>
              ) : (
                <ThreeCharacterPreview
                  src={modelUrls[model]}
                  model={model}
                  parts={character}
                  animationName={null}
                />
              )}
            </div>
            <div className="character-design-rotate" aria-hidden="true"><span>↪</span><span>↩</span></div>
            <small>드래그해서 캐릭터를 돌려보세요</small>
          </aside>

          <div className="character-design-controls">
            <div className="character-model-picker" aria-label="캐릭터 선택">
              {(['girl1', 'boy1', 'cloths'] as CharacterModel[]).map(option => (
                <button type="button" key={option} className={model === option ? 'selected' : ''} onClick={() => selectModel(option)}>
                  <span className="character-model-face">{modelFaces[option]}</span>
                  <strong>{option === 'chungnyeong' ? '충녕이' : option === 'girl1' ? '여성형' : option === 'boy1' ? '남성형' : option === 'cloths' ? '캐주얼형' : '커스텀'}</strong>
                  <small>{option === 'custom' ? '2D 미리보기' : option === 'chungnyeong' ? '3D 캐릭터' : option === 'girl1' ? '3D 여성형' : option === 'boy1' ? '3D 남성형' : '3D 리깅 캐릭터'}</small>
                </button>
              ))}
            </div>

            <div className="character-style-list">
              {(model==='boy1'
                ?(['hair','face','top','topLayer','bottom','shoes','accessory'] as PartKind[])
                :(['hair','face','top','bottom','shoes','accessory'] as PartKind[]).filter(kind=>kind!=='accessory'||model==='cloths')).map(kind => (
                <div className="character-style-row" key={kind}>
                  <span className="character-style-name"><i>{partLabels[kind].icon}</i><strong>{kind==='top'&&model==='boy1'?'상의 위':partLabels[kind].label}</strong></span>
                  <div className={`character-style-options ${model==='cloths'?'with-original':''}`}>
                    {(model==='girl1'||model==='boy1'||model==='cloths'
                        ?[{id:`${kind}-original`,label:'원본 색상',color:'conic-gradient(#f1a36b,#59372d,#f0d8bf,#7195ca,#f1a36b)'},...assetManifest[kind]]
                        :assetManifest[kind]).map(option => (
                      <button
                        type="button"
                        key={option.id}
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={character[kind] === option.id}
                        className={`${character[kind] === option.id ? 'selected' : ''} ${option.id.endsWith('-original')?'original-color-option':''}`}
                        style={{'--option-color': option.color} as React.CSSProperties}
                        onClick={() => part(kind, option.id)}
                      >
                        {option.id.endsWith('-none')?<span>×</span>:option.id.endsWith('-original')?<span>원본</span>:character[kind] === option.id && <span>✓</span>}
                      </button>
                    ))}
                    <label
                      className={`character-custom-color ${customPartColor(kind,character[kind])?'selected':''}`}
                      title={`${partLabels[kind].label} 색 직접 고르기`}
                    >
                      <input
                        type="color"
                        aria-label={`${partLabels[kind].label} 색 직접 고르기`}
                        value={customPartColor(kind,character[kind])??getPart(kind,character[kind]).color}
                        onChange={event=>part(kind,customPartId(kind,event.target.value))}
                      />
                      <i style={{background:customPartColor(kind,character[kind])??'conic-gradient(#f46b6b,#f1c75b,#5cc98b,#5b8ff1,#bd6af2,#f46b6b)'}}/>
                      <b>직접</b>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="character-design-actions">
          <button type="button" className="character-design-back" onClick={onBack ?? (() => window.history.back())}>이전</button>
          <button type="button" className="character-design-submit" onClick={onSubmit}>{editMode?'변경 완료':'캐릭터 저장하기'} <span>→</span></button>
        </footer>
      </section>
    </main>
  );
}
