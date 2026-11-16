import React from 'react';
import { Composition } from 'remotion';
import { FPS } from './theme';
import { Video, totalFrames } from './Video';
import { mainScenes } from './Main';
import { shortScenes } from './Short';

const MainComp: React.FC = () => <Video scenes={mainScenes()} />;
const ShortComp: React.FC = () => <Video scenes={shortScenes()} />;

export const RemotionRoot: React.FC = () => {
  const mainLen = totalFrames(mainScenes());
  const shortLen = totalFrames(shortScenes());
  return (
    <>
      <Composition id="Main16x9" component={MainComp} durationInFrames={mainLen} fps={FPS} width={1920} height={1080} />
      <Composition id="Main9x16" component={MainComp} durationInFrames={mainLen} fps={FPS} width={1080} height={1920} />
      <Composition id="Short9x16" component={ShortComp} durationInFrames={shortLen} fps={FPS} width={1080} height={1920} />
    </>
  );
};
