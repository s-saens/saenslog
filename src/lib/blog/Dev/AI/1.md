---
title: 'Qwen3TTS를 활용하여 명상 세션 만들기'
date: 2026-04-15 17:10
---

## 1. 서론

최근에 오픈소스 TTS 모델 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)가 공개되었습니다. 감정 표현이 굉장해서, 저는 이 모델을 사용해서 수면 명상 컨텐츠 제작 파이프라인을 구축하고 있습니다. 이 글에서는 모델에 어떤 기능이 있는지, 어떻게 활용하면 좋을지에 대해 다룹니다.

## 2. Pinokio

환경을 빠르게 구축해보기 위해 [Pinokio](https://pinokio.co/)를 이용했습니다. Pinokio는 커뮤니티 **레시피**를 통해 가상환경 세팅부터 의존성 설치, 실행까지 한 번에 처리해 주는 로컬 런처라, 터미널에서 명령어를 하나씩 입력할 필요 없이 브라우저에서 바로 데모를 띄울 수 있습니다. Qwen3-TTS 레시피는 [Gradio](https://www.gradio.app/)로 간단한 웹 UI를 제공하는 형태에 API도 함께 있어서 Pinokio로 띄운 Qwen3-TTS를 파이썬 코드에서 직접 다루는 것도 가능합니다.

1. **Voice Design**  
   말투·나이·캐릭터 등을 적으면, 그에 맞는 음성으로 텍스트를 읽어줍니다.

2. **Custom Voice**  
   미리 설정된 프리셋을 기반으로 프롬프트를 더해서 그에 맞게 텍스트를 읽습니다.

3. **Voice Cloning**  
   레퍼런스 음성과 그 읽는 텍스트에 대한 정보를 바탕으로 새로운 텍스트를 읽습니다.

pinokio에서 띄운 Qwen3-TTS의 Gradio API를 기반으로 위 기능들을 다루는 qwen3tts.py를 만들어달라고 AI에게 부탁하면 잘 만들어줄겁니다.

## 3. 목소리 저장 : Voice Cloning

특정 목소리에 대한 녹음이 있다면 상관 없지만, Voice Design, Custom Voice 기능을 이용하여 한 번 생성한 목소리로 다른 텍스트까지 읽기를 원한다면 Cloning 기능을 사용해야 합니다. 프롬프트와 시드가 같아도 문장이 다르면 목소리도 달라지기 때문입니다.

### a. 레퍼런스 음성 생성

맘에 드는 레퍼런스 음성을 먼저 만듭니다. 프롬프트가 아무리 잘 짜여있어도 원하는 목소리가 나오기 어려워서, 여러 번 돌려 봐야 합니다. 그래서 스크립트로 한꺼번에 여러 개 레퍼런스 음성을 만들어주면 좋습니다. 저는 저는 Voice Design을 사용하여 다음과 같은 프롬프트로 텍스트를 읽는 작업을 100 번 돌렸습니다. 5060Ti 기준 한 개 당 1분 좀 넘게 걸렸습니다.

i. 보이스 디자인에서 사용된 프롬프트

> Voice for guided sleep meditation: professional, grounded female narrator. Timbre deep and resonant, low to mid register, warm and soft—never harsh or nasal. Pace extremely slow and unhurried; generous pauses between phrases and at punctuation; let silence breathe. Delivery calm, steady, reassuring; soft-spoken intimacy without mumbling—keep consonants clear and vowels relaxed. Dynamics even and controlled: consistent moderate volume, no sudden loud peaks or trailing whispers unless the script asks for emphasis. Breath-supported, smooth phrasing; comforting presence, non-theatrical. Clean studio speech, high fidelity, minimal mouth noise.

i. 읽을 텍스트

> 밤하늘의 별빛이 부드럽게 당신을 감싸 안습니다. 깊게 들숨, 길게 날숨, 어깨와 턱의 힘을 천천히 놓아 봅니다. 쉼표처럼 멈춰 있는 이 순간, 별 하나하나를 세어 가며 마음의 잡음은 조용히 가라앉고, 따스한 공기가 폐 깊숙이 스며듭니다. 꿈결처럼 포근한 안식이 찾아올 때까지, 당신은 천천히, 아주 천천히, 편안한 잠으로 스며듭니다. 찰나의 햇살, 풀잎 위의 이슬, 달빛 아래의 고요함까지 떠올려 보아도 좋습니다. 부드럽게 입술을 닫았다 열며, 숨의 길이를 조금씩 늘려 보아도 됩니다. 아무것도 하지 않아도 괜찮습니다. 그저 쉬어 가도 됩니다.

그렇게 해서 나온 것 중 세개를 가져와 봤습니다.

<!-- markdownlint-disable MD033 -->
<audio controls>
<source src="/blog/Dev/AI/1/ref0.wav" type="audio/wav" />
브라우저가 오디오 요소를 지원하지 않습니다.
</audio>
<!-- markdownlint-enable MD033 -->
<!-- markdownlint-disable MD033 -->
<audio controls>
<source src="/blog/Dev/AI/1/ref1.wav" type="audio/wav" />
브라우저가 오디오 요소를 지원하지 않습니다.
</audio>
<!-- markdownlint-enable MD033 -->
<!-- markdownlint-disable MD033 -->
<audio controls>
<source src="/blog/Dev/AI/1/ref2.wav" type="audio/wav" />
브라우저가 오디오 요소를 지원하지 않습니다.
</audio>
<!-- markdownlint-enable MD033 -->

보시다시피 **female**이라는 프롬프트가 있지만 남성 목소리도 같이 뽑혔습니다. 이렇게 한번에는 잘 안나오기 때문에 이걸 생성하고, 체크하고, 생성하고, 체크한다면 시간이 많이 낭비됩니다. 그래서 쉬는 시간에 여러 개 생성 스크립트 돌려 놓고 나중에 한꺼번에 검수하는거죠. 그렇게 첫번째 음성을 레퍼런스로 선택했습니다.

### b. Voice Cloning

위에서 선별한 레퍼런스 음성과, 레퍼런스 텍스트를 똑같이 입력해주고, 새로 읽을 문장을 문장이 너무 길면 음성이 이상하거나, 음량이 들쭉날쭉하게 됩니다. 그래서 하나의 텍스트를 길게 뽑고싶다면, 한 문장 단위로 끊어서 생성한 뒤 이를 적절히 합쳐주는 게 좋습니다. 그렇게 얻은 첫번째 음성입니다.

<!-- markdownlint-disable MD033 -->
<audio controls>
<source src="/blog/Dev/AI/1/00001.wav" type="audio/wav" />
브라우저가 오디오 요소를 지원하지 않습니다.
</audio>
<!-- markdownlint-enable MD033 -->

LLM으로 생성한 약 140문장 분량의 명상 텍스트를 한 문장씩 끊어서 읽도록 하고, 이후에 합치는 과정을 거쳐 10분이 조금 넘는 명상 세션을 생성했습니다.  
<br/>
이런 방식으로 명상 세션을 만들고, 명상의 퀄리티를 더 높이기 위한 추가 과정들까지 포함하여 파이프라인을 구축하고 있으며, 이렇게 생성된 명상들을 태깅하여 매일 밤마다 사용자의 상태에 따라 최적의 수면 명상을 매우 편리하게 제공하기 위한 서비스를 만들고 있습니다.
