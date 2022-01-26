import { GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function loadMorePosts(): Promise<void> {
    fetch(nextPage)
      .then(response => response.json())
      .then(data => {
        const dataPosts: Post[] = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: String(
              format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })
            ),
            data: {
              title: RichText.asText(post.data.title),
              subtitle: RichText.asText(post.data.subtitle),
              author: RichText.asText(post.data.author),
            },
          };
        });

        const morePosts = posts.concat(dataPosts);

        setPosts(morePosts);
        setNextPage(data.next_page);
      });
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>
      <main className={commonStyles.mainContainer}>
        <div className={commonStyles.postsContainer}>
          {posts.map(post => (
            <article className={styles.post}>
              <Link key={post.uid} href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div>
                    <time>
                      <FiCalendar />
                      <span>{post.first_publication_date}</span>
                    </time>
                    <span>
                      <FiUser />
                      <span>{post.data.author}</span>
                    </span>
                  </div>
                </a>
              </Link>
            </article>
          ))}

          {nextPage && (
            <button
              type="button"
              onClick={loadMorePosts}
              className={styles.loadMorePostsButton}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: String(
        format(new Date(post.first_publication_date), 'dd MMM yyyy', {
          locale: ptBR,
        })
      ),
      data: {
        title: RichText.asText(post.data.title),
        subtitle: RichText.asText(post.data.subtitle),
        author: RichText.asText(post.data.author),
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
