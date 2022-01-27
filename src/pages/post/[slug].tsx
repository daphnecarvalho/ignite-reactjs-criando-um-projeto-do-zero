import { GetStaticPaths, GetStaticProps } from 'next';

import Head from 'next/head';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import { format, minutesToHours } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import Comments from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({
  post,
  preview,
  navigation,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  function formatDate(date: string): string {
    return String(
      format(new Date(date), 'dd MMM yyyy', {
        locale: ptBR,
      })
    );
  }

  function calculateReadingTime(content: Content[]): string {
    const getHeadingWordsPerMinutes = content.reduce((acc, currentValue) => {
      if (currentValue.heading !== null) {
        return currentValue.heading.split(/\s+/).length + acc;
      }
      return acc;
    }, 0);

    const getBodyWordsPerMinutes = content.reduce((acc, currentValue) => {
      return RichText.asText(currentValue.body).split(/\s+/).length + acc;
    }, 0);

    const getWordsPerMinutes = Math.ceil(
      (getHeadingWordsPerMinutes + getBodyWordsPerMinutes) / 200
    );

    if (getWordsPerMinutes < 1) {
      return 'Rápida leitura';
    }

    if (getWordsPerMinutes < 60) {
      return `${getWordsPerMinutes} min`;
    }

    return `${minutesToHours(getWordsPerMinutes)} horas`;
  }

  function getDatePostEdited(
    first_publication_date: string,
    last_publication_date: string
  ): string {
    const isPostEdited =
      new Date(first_publication_date).getTime() !==
      new Date(last_publication_date).getTime();

    if (isPostEdited) {
      return format(
        new Date(last_publication_date),
        "'* editado em' dd MMM yyyy', às 'HH':'mm",
        {
          locale: ptBR,
        }
      );
    }

    return '';
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      {post.data.banner && (
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt="banner"
        />
      )}

      <main className={styles.mainContainer}>
        <article className={commonStyles.postsContainers}>
          <header>
            <h1>{post.data.title}</h1>
            <div>
              <time>
                <FiCalendar size={20} />
                <span>{formatDate(post.first_publication_date)}</span>
              </time>
              <span>
                <FiUser size={20} />
                <span>{post.data.author}</span>
              </span>
              <time>
                <FiClock size={20} />
                <span>{calculateReadingTime(post.data.content)}</span>
              </time>
            </div>
            <time>
              {getDatePostEdited(
                post.first_publication_date,
                post.first_publication_date
              )}
            </time>
          </header>

          {post.data.content.map(content => {
            return (
              <section key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </section>
            );
          })}
        </article>

        {navigation && (
          <section className={styles.postsNavigation}>
            {navigation.prevPost.length > 0 && (
              <div>
                <h3>{navigation.prevPost[0].data.title}</h3>
                <Link href={`/post/${navigation.prevPost[0].uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}

            {navigation.nextPost.length > 0 &&
              navigation.prevPost.length > 0 &&
              navigation.prevPost[0].uid !== navigation.nextPost[0].uid && (
                <div>
                  <h3>{navigation.nextPost[0].data.title}</h3>
                  <Link href={`/post/${navigation.nextPost[0].uid}`}>
                    <a>Próximo post</a>
                  </Link>
                </div>
              )}
          </section>
        )}

        <Comments />

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const { slug } = params;

  const response = await prismic.getByUID('post', String(slug), {});

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
      ref: previewData?.ref ?? null,
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url ?? '',
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      preview,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
