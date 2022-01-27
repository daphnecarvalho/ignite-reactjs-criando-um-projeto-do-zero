import { GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
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
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  function formatDate(date: string): string {
    return String(
      format(new Date(date), 'dd MMM yyyy', {
        locale: ptBR,
      })
    );
  }

  async function loadMorePosts(): Promise<void> {
    fetch(nextPage)
      .then(response => response.json())
      .then(data => {
        if (!data.results) {
          return;
        }

        const dataPosts: Post[] = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
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
            <article className={styles.post} key={post.uid}>
              <Link key={post.uid} href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div>
                    <time>
                      <FiCalendar size={20} />
                      <span>{formatDate(post.first_publication_date)}</span>
                    </time>
                    <span>
                      <FiUser size={20} />
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

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 2,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
      preview,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
