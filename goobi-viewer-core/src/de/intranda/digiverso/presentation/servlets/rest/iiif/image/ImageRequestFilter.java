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
package de.intranda.digiverso.presentation.servlets.rest.iiif.image;

import java.io.IOException;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.ext.Provider;

import org.apache.commons.lang.text.StrTokenizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.intranda.digiverso.presentation.controller.DataManager;
import de.intranda.digiverso.presentation.controller.StringTools;
import de.intranda.digiverso.presentation.exceptions.DAOException;
import de.intranda.digiverso.presentation.exceptions.IndexUnreachableException;
import de.intranda.digiverso.presentation.managedbeans.utils.BeanUtils;
import de.intranda.digiverso.presentation.model.security.AccessConditionUtils;
import de.unigoettingen.sub.commons.contentlib.exceptions.IllegalRequestException;
import de.unigoettingen.sub.commons.contentlib.exceptions.ServiceNotAllowedException;
import de.unigoettingen.sub.commons.contentlib.imagelib.transform.Scale;
import de.unigoettingen.sub.commons.contentlib.imagelib.transform.Scale.AbsoluteScale;
import de.unigoettingen.sub.commons.contentlib.imagelib.transform.Scale.RelativeScale;
import de.unigoettingen.sub.commons.contentlib.servlet.rest.ContentExceptionMapper.ErrorMessage;
import de.unigoettingen.sub.commons.contentlib.servlet.rest.ContentServerImageBinding;

@Provider
@ContentServerImageBinding
public class ImageRequestFilter implements ContainerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ImageRequestFilter.class);

    @Context
    private HttpServletRequest servletRequest;

    @SuppressWarnings("unchecked")
    @Override
    public void filter(ContainerRequestContext request) throws IOException {
        try {
            String requestPath = servletRequest.getRequestURI();
            requestPath = requestPath.substring(requestPath.indexOf("image/") + 6);
            logger.trace("Filtering request " + requestPath);
            StrTokenizer tokenizer = new StrTokenizer(requestPath, "/");
            List<String> pathSegments = tokenizer.getTokenList();
            String pi = pathSegments.get(0);
            String imageName = pathSegments.get(1);
            imageName = StringTools.decodeUrl(imageName);
            String size;
            if (pathSegments.size() > 4) {
                pathSegments.get(2);
                size = pathSegments.get(3);
                pathSegments.get(4);
            } else {
                size = "full";
            }
            if(!BeanUtils.getImageDeliveryBean().isExternalUrl(imageName) && !BeanUtils.getImageDeliveryBean().isCmsUrl(imageName) && !BeanUtils.getImageDeliveryBean().isStaticImageUrl(imageName)) {                
                filterForAccessConditions(request, pi, imageName, size);
                filterForImageSize(requestPath, size);
            }
        } catch (ServiceNotAllowedException e) {
            String mediaType = MediaType.APPLICATION_JSON;
//            if (request.getUriInfo() != null && request.getUriInfo().getPath().endsWith("json")) {
//                mediaType = MediaType.APPLICATION_JSON;
//            }
            Response response = Response.status(Status.NOT_FOUND).type(mediaType).entity(new ErrorMessage(Status.NOT_FOUND, e, false)).build();
            request.abortWith(response);
        }
    }

    /**
     * @param requestPath
     * @param pathSegments
     * @throws ServiceNotAllowedException
     * @throws IndexUnreachableException
     */
    private void filterForAccessConditions(ContainerRequestContext request, String pi, String contentFileName, String sizeSegment)
            throws ServiceNotAllowedException {
        logger.trace("filterForAccessConditions: " + servletRequest.getSession().getId());

        int imageWidth = Integer.MAX_VALUE;
        try {
            Scale scale = Scale.getScaleMethod(sizeSegment);
            imageWidth = Integer.parseInt(scale.getWidth());
        } catch (NumberFormatException | IllegalRequestException | NullPointerException e) {
            //no image width, assume large image
        }

        boolean isThumb = imageWidth <= DataManager.getInstance().getConfiguration().getUnconditionalImageAccessMaxWidth();
        boolean access = false;
        try {
            if (isThumb) {
                access = AccessConditionUtils.checkAccessPermissionForThumbnail(servletRequest, pi, contentFileName);
                //                                logger.trace("Checked thumbnail access: {}/{}: {}", pi, contentFileName, access);
            } else {
                access = AccessConditionUtils.checkAccessPermissionForImage(servletRequest, pi, contentFileName);
                //                                logger.trace("Checked image access: {}/{}: {}", pi, contentFileName, access);
            }
        } catch (IndexUnreachableException e) {
            throw new ServiceNotAllowedException("Serving this image is currently impossibe due to ");
        } catch (DAOException e) {
            throw new ServiceNotAllowedException("Serving this image is currently impossibe due to ");
        }

        if (!access) {
            throw new ServiceNotAllowedException("Serving this image is restricted due to access conditions");
        }
    }

    private static void filterForImageSize(String requestPath, String sizeSegment) throws ServiceNotAllowedException {
        try {
            Scale scale = Scale.getScaleMethod(sizeSegment);
            if (scale instanceof AbsoluteScale) {
                int maxWidth = DataManager.getInstance().getConfiguration().getViewerMaxImageWidth();
                int maxHeight = DataManager.getInstance().getConfiguration().getViewerMaxImageHeight();
                if (maxWidth > 0 && parse(scale.getWidth()) > maxWidth) {
                    throw new ServiceNotAllowedException("Requested image width may not exceed " + maxWidth + "px");
                }
                if (maxHeight > 0 && parse(scale.getHeight()) > maxHeight) {
                    throw new ServiceNotAllowedException("Requested image height may not exceed " + maxHeight + "px");
                }
            } else if (scale instanceof RelativeScale) {
                int maxScale = DataManager.getInstance().getConfiguration().getViewerMaxImageScale();
                if (maxScale > 0 && parse(scale.getPercent()) > maxScale) {
                    throw new ServiceNotAllowedException("Requested image scale may not exceed " + maxScale + "%");
                }
            }
        } catch (IllegalRequestException | NullPointerException | NumberFormatException e) {
            logger.debug("Cannot deduce scale from " + requestPath);
        }
    }

    /**
     * @param width
     * @return
     */
    private static int parse(String string) {
        try {
            return Integer.parseInt(string);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

}
