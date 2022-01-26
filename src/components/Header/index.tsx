import Image from 'next/image';

import styles from './header.module.scss';

export default function Header() {
  return (
    <header className={styles.headerContainer}>
      <div className={styles.headerContent}>
        <Image
          src="/images/logo.svg"
          alt="spacetraveling"
          width="239"
          height="27"
        />
      </div>
    </header>
  );
}
