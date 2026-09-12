import AppLink from '@/components/AppLink';
import { formatCount } from '@/utils/formatCount';

type Props = {
    communities: any[];
};

export default function ExploreCommunities({
    communities,
}: Props) {
    return (
        <div className="w-full mb-5">

            <div className="flex items-center justify-between pl-3 pr-5 mb-3">
                <h2 className="text-gray-700 dark:text-gray-200 text-lg font-bold">
                    Explore Communities
                </h2>

                <AppLink
                    href="/main/tribe"
                    className="text-indigo-600 text-sm"
                >
                    See all
                </AppLink>
            </div>

            <div className="w-full overflow-hidden">
              <div className="flex flex-nowrap gap-3 overflow-x-auto px-1 scrollbar-hide">
  
                  {communities.map((community) => (
  
                      <AppLink
                        key={community.id}
                        href={`/main/community/${community.id}`}
                        className="flex-none w-28 rounded-xl shadow p-2 flex flex-col items-center"
                    >
                        <img
                            src={community.cover_image_url}
                            className="w-20 h-20 rounded-xl object-cover"
                        />
                    
                        <p className="mt-2 w-full text-center text-gray-600 dark:text-gray-300 font-medium truncate">
                            {community.name}
                        </p>
                    
                        <p className="w-full text-center text-xs text-gray-500 truncate">
                            {formatCount(community.members_count)} members
                        </p>
                      </AppLink>
  
                  ))}
  
              </div>
            </div>

        </div>
    );
}