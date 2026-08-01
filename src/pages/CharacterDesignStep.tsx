import { assetManifest,customPartColor,customPartId,getPart } from '../data/assetManifest';
import { CharacterPreview } from '../components/CharacterPreview';
import { ThreeCharacterPreview } from '../components/ThreeCharacterPreview';
import type { CharacterModel, PartKind, UserProfile } from '../types';

const modelUrls: Record<Exclude<CharacterModel, 'custom'>, string> = {
  chungnyeong: new URL('../assets/characters/chungnyeong.glb', import.meta.url).href,
  girl1: new URL('../assets/characters/girl_metaverse_animated.glb', import.meta.url).href,
  boy1: new URL('../assets/characters/boy_metaverse.glb', import.meta.url).href,
  cloths: new URL('../assets/characters/men_total.glb', import.meta.url).href,
  women: new URL('../assets/characters/women_total.glb', import.meta.url).href
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

const modelDisplay: Record<CharacterModel, {name:string; description:string}> = {
  custom:{name:'커스텀',description:'2D 미리보기'},
  chungnyeong:{name:'충녕이',description:'3D 캐릭터'},
  girl1:{name:'여성형',description:'기본 디자인 · 모션 3종'},
  boy1:{name:'남성형',description:'기본 디자인 · 모션 3종'},
  cloths:{name:'남성형 2',description:'확장 디자인 · 이모션 5종'},
  women:{name:'여성형 2',description:'확장 디자인 · 이모션 6종'},
};

export function CharacterDesignStep({
  model,
  character,
  part,
  selectHairStyle,
  selectGarmentStyle,
  selectModel,
  onSubmit,
  editMode,
  onBack,
  onHome
}: {
  model: CharacterModel;
  character: UserProfile['character'];
  part: (k: PartKind, id: string) => void;
  selectHairStyle: (style:'hair1'|'hair2') => void;
  selectGarmentStyle: (kind:'topStyle'|'bottomStyle'|'shoesStyle',style:'style1'|'style2') => void;
  selectModel: (m: CharacterModel) => void;
  onSubmit: () => void;
  editMode: boolean;
  onBack?: () => void;
  onHome?: () => void;
}) {
  const modelFaces: Record<CharacterModel, string> = {chungnyeong: '🧑🏻‍🌾', girl1: '👧🏻', boy1: '👦🏻', cloths: '🧑🏻', women: '👩🏻', custom: '＋'};

  return (
    <main className="character-design-page">
      <section className="character-design-card">
        {onHome&&<button type="button" className="onboarding-home-button" onClick={onHome}>홈으로</button>}
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
                  animationName={model==='women'||model==='cloths'?'standing':null}
                  animationTime={model==='women'||model==='cloths'?0:undefined}
                />
              )}
            </div>
            <div className="character-design-rotate" aria-hidden="true"><span>↪</span><span>↩</span></div>
            <small>드래그해서 캐릭터를 돌려보세요</small>
          </aside>

          <div className={`character-design-controls ${model==='boy1'||model==='women'||model==='cloths'?'compact-options':''}`}>
            <div className="character-model-picker" aria-label="캐릭터 선택">
              {(['girl1', 'boy1', 'women', 'cloths'] as CharacterModel[]).map(option => (
                <button type="button" key={option} className={model === option ? 'selected' : ''} onClick={() => selectModel(option)}>
                  <span className="character-model-face">{modelFaces[option]}</span>
                  <strong>{modelDisplay[option].name}</strong>
                  <small>{modelDisplay[option].description}</small>
                </button>
              ))}
            </div>

            <div className="character-style-list">
              {(model==='women'||model==='cloths')&&<div className="women-shape-grid">
                <div className="character-style-row">
                  <span className="character-style-name"><i>✂️</i><strong>머리 모양</strong></span>
                  <div className="character-style-options garment-style-options">
                    {([
                      {id:'hair1' as const,label:'헤어 1'},
                      {id:'hair2' as const,label:'헤어 2'},
                    ]).map(option=><button
                      type="button"
                      key={option.id}
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={(character.hairStyle==='hair2'?'hair2':'hair1')===option.id}
                      className={(character.hairStyle==='hair2'?'hair2':'hair1')===option.id?'selected':''}
                      style={{'--option-color':option.id==='hair1'?'#d9ece7':option.id==='hair2'?'#b9d9d0':'conic-gradient(#d9ece7,#8cbcaf,#d9ece7)'} as React.CSSProperties}
                      onClick={()=>selectHairStyle(option.id)}
                    ><span>{option.id==='hair1'?'1':'2'}</span></button>)}
                  </div>
                </div>
                {([
                  {kind:'topStyle' as const,label:'상의 모양',icon:'👚'},
                  {kind:'bottomStyle' as const,label:'하의 모양',icon:'👖'},
                  {kind:'shoesStyle' as const,label:'신발 모양',icon:'👟'},
                ]).map(item=><div className="character-style-row" key={item.kind}>
                  <span className="character-style-name"><i>{item.icon}</i><strong>{item.label}</strong></span>
                  <div className="character-style-options garment-style-options">
                    {(['style1','style2'] as const).map((style,index)=><button
                      type="button"
                      key={style}
                      title={`${item.label} ${index+1}`}
                      aria-label={`${item.label} ${index+1}`}
                      aria-pressed={(character[item.kind]??'style1')===style}
                      className={(character[item.kind]??'style1')===style?'selected':''}
                      style={{'--option-color':index===0?'#d9ece7':'#b9d9d0'} as React.CSSProperties}
                      onClick={()=>selectGarmentStyle(item.kind,style)}
                    ><span>{index+1}</span></button>)}
                  </div>
                </div>)}
              </div>}
              {(model==='boy1'
                ?(['hair','face','top','topLayer','bottom','shoes','accessory'] as PartKind[])
                :model==='women'||model==='cloths'
                  ?(['hair','face','top','topLayer','bottom','shoes'] as PartKind[])
                :(['hair','face','top','bottom','shoes'] as PartKind[])).map(kind => (
                <div className="character-style-row" key={kind}>
                  <span className="character-style-name"><i>{partLabels[kind].icon}</i><strong>{
                    (model==='women'||model==='cloths')&&kind==='top'?'겉옷':
                    (model==='women'||model==='cloths')&&kind==='topLayer'?'안쪽 옷':
                    model==='women'&&kind==='shoes'?'샌들':
                    kind==='top'&&model==='boy1'?'상의 위':
                    partLabels[kind].label
                  }</strong></span>
                  <div className={`character-style-options ${model==='cloths'||model==='women'?'with-original':''}`}>
                    {(model==='girl1'||model==='boy1'||model==='cloths'||model==='women'
                        ?[{id:kind==='topLayer'?'top-layer-original':`${kind}-original`,label:'원본 색상',color:'conic-gradient(#f1a36b,#59372d,#f0d8bf,#7195ca,#f1a36b)'},...assetManifest[kind]]
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
