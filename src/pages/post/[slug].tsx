import { GetStaticPaths, GetStaticProps } from 'next';

import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;
    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));

    return total;
  }, 0);
  const readTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <img src={post.data.banner.url} alt="imagem" className={styles.banner} />

      <main className={styles.mainContainer}>
        <article className={commonStyles.postsContainers}>
          <h1>{post.data.title}</h1>
          <div>
            <time>
              <FiCalendar />
              <span>
                {String(
                  format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                    locale: ptBR,
                  })
                )}
              </span>
            </time>
            <span>
              <FiUser />
              <span>{post.data.author}</span>
            </span>
            <time>
              <FiClock />
              <span>{`${readTime} min`}</span>
            </time>
          </div>

          {post.data.content.map(content => {
            return (
              <article key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            );
          })}
        </article>
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
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response: Post = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
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
    },
  };
};
