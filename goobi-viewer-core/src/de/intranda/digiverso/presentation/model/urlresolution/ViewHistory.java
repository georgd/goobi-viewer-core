/**
 * This file is part of the Goobi viewer - a content presentation and management application for digitized objects.
 *
 * Visit these websites for more information.
 *          - http://www.intranda.com
 *          - http://digiverso.com
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package de.intranda.digiverso.presentation.model.urlresolution;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Paths;
import java.util.Optional;

import javax.faces.context.FacesContext;
import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.ocpsoft.pretty.PrettyContext;

import de.intranda.digiverso.presentation.exceptions.DAOException;
import de.intranda.digiverso.presentation.model.viewer.PageType;
import de.intranda.digiverso.presentation.servlets.utils.ServletUtils;

/**
 * This class offers methods to store information about the current and previous html-view (page) in the session store
 * 
 * The fullscreen view is explicitly excluded from the recorded views, since it acts only as a magnification of the image view, not as a seperate page
 * 
 * @author Florian Alpers
 *
 */
public class ViewHistory {

    private static Logger logger = LoggerFactory.getLogger(ViewHistory.class);

    private static final String PREVIOUS_URL = "previousURL";
    private static final String CURRENT_URL = "currentURL";

    private static final PageType[] IGNORED_VIEWS = new PageType[] { PageType.viewFullscreen };

    /**
     * Saves the current view information to the session map. 
     * Also saves the previous view information to the session map if it represents a different view than the current view
     * 
     * @param request
     * @throws DAOException
     */
    public synchronized static void setCurrentView(final ServletRequest request) {

        try {
            if (request != null) {
                HttpServletRequest httpRequest = (HttpServletRequest) request;
                HttpSession session = httpRequest.getSession();
                if (session != null) {
                    String hostUrl = ServletUtils.getServletPathWithHostAsUrlFromRequest(httpRequest);
                    String applicationName = httpRequest.getContextPath();
                    String serviceUrl = ((HttpServletRequest) request).getRequestURI();
                    PrettyContext context = PrettyContext.getCurrentInstance(httpRequest);
                    if (context != null && context.getRequestURL() != null) {
                        serviceUrl = ServletUtils.getServletPathWithHostAsUrlFromRequest(httpRequest) + context.getRequestURL().toURL();
                    }

                    Optional<ViewerPath> oCurrentPath = ViewerPathBuilder.createPath(hostUrl, applicationName, serviceUrl);
                    if(oCurrentPath.isPresent()) {
                        //viewer page url
                        setCurrentView(oCurrentPath.get(), session);
                    } else {
                        //some other url
                        return;
                    }
                }
            }
        } catch (Throwable e) {
            //catch all throwables to avoid constant redirects to error
            logger.error("Error saving page url", e);
        }
    }

    /**
     * Saves the given {@code currentPath} to the session map, keeping the previously stored currentPath as previousPath if 
     * it has a different PageType than the current path
     * 
     * The path stored as currentPath can be retrieved by {@link #getCurrentView(ServletRequest)}; the previously stored path
     * can be retrieved by {@link #getPreviousView(ServletRequest)}
     * 
     * @param session       The http session to store the path in
     * @param currentPath   The path to store
     */
    public static void setCurrentView(ViewerPath currentPath, HttpSession session) {
        if(!isIgnoredView(currentPath.getPagePath())) {
            ViewerPath previousPath = (ViewerPath) session.getAttribute(CURRENT_URL);
            session.setAttribute(CURRENT_URL, currentPath);
            logger.trace("Set session attribute {} to {}", CURRENT_URL, currentPath);
            if(previousPath != null && !currentPath.getPagePath().equals(previousPath.getPagePath())) {
                //different page
                session.setAttribute(PREVIOUS_URL, previousPath);
                logger.trace("Set session attribute {} to {}", PREVIOUS_URL, previousPath);
            }
        }
    }



    /**
     * Returns true if the path matches one of the ignored views
     * 
     * @param path  The path to check
     * @return
     */
    private static boolean isIgnoredView(URI path) {
        for (PageType pageType : IGNORED_VIEWS) {
            if(path.toString().equals(pageType.getName())) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Retrieves the stored currentPath from the session associated the the passed {@code request}
     * 
     * @param request   The request linking the the session which stores the path. May be retrieved by 
     * {@link de.intranda.digiverso.presentation.managedbeans.utils.BeanUtils#getRequest() BeanUtils.getRequest}
     * @return          An optional containing the last stored current path if available. An empty optional if no session is available or no path has been stored yet
     */
    public synchronized static Optional<ViewerPath> getCurrentView(ServletRequest request) {
        if (request != null) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpSession session = httpRequest.getSession();

            if (session != null) {
                ViewerPath previousPath =  (ViewerPath) session.getAttribute(CURRENT_URL);
                if(previousPath != null) {
                    return Optional.of(new ViewerPath(previousPath));
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Retrieves the stored previousPath from the session associated the the passed {@code request}
     * 
     * @param request   The request linking the the session which stores the path. May be retrieved by 
     * {@link de.intranda.digiverso.presentation.managedbeans.utils.BeanUtils#getRequest() BeanUtils.getRequest}
     * @return          An optional containing the last stored previous path if available. An empty optional if no session is available or no previous path has been stored yet
     */
    public synchronized static Optional<ViewerPath> getPreviousView(ServletRequest request) {
        if (request != null) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpSession session = httpRequest.getSession();

            if (session != null) {
                ViewerPath previousPath =  (ViewerPath) session.getAttribute(PREVIOUS_URL);
                if(previousPath != null) {
                    return Optional.of(new ViewerPath(previousPath));
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Directly redirect to the given url
     *  
     * @param url           The url to redirect to
     * @throws IOException  If redirect fails
     */
    public synchronized static void redirectToUrl(String url) throws IOException {

        FacesContext.getCurrentInstance().getExternalContext().getFlash().setRedirect(true);
        FacesContext.getCurrentInstance().getExternalContext().redirect(url);
    }


}
