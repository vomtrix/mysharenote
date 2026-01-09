import Image from 'next/image';
import { SOCIAL_URLS } from '@config/config';
import styles from '@styles/scss/SocialLinks.module.scss';

const SocialLinks = () => {
  return (
    <div className={styles.socialIcons}>
      {Object.keys(SOCIAL_URLS).map((socialName, i) => (
        <a key={i} href={SOCIAL_URLS[socialName]} target="_blank" rel="noopener">
          <Image src={`/assets/${socialName}.png`} alt={socialName} width={20} height={20} />
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;
